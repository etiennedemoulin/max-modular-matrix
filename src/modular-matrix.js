import path from 'node:path';
import fs from 'node:fs';
import Max from 'max-api';
import JSON5 from 'json5';
import { mixing } from './mixing.js';

const globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  userMatrix: { inputs: [], outputs: [], initwith: ""},
  routingMatrix: { inputs: [], outputs: [], initwith: ""}
};

Max.addHandlers({
  [Max.MESSAGE_TYPES.BANG]: () => {},
  [Max.MESSAGE_TYPES.LIST]: (row, col, gain) => onList(row, col, gain),
  [Max.MESSAGE_TYPES.NUMBER]: (num) => {},
  debug: (verbose) => onDebug(verbose),
  maxId: (maxId) => globals.maxId = maxId,
  ramp: (ramp) => globals.ramp = ramp,
  done: () => bootstrap(),
  generate: (filename) => onGenerate(filename),
  file: (filename) => globals.structure = JSON5.parse(fs.readFileSync(filename)),
  routing: (row, col, gain) => onRouting(row, col, gain),
  clear: () => onClear(),
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
});

const handledMessages = ['debug', 'maxId', 'ramp', 'done', 'generate', 'structure', 'routing', 'clear'];

function log(...args) {
  if (globals.verbose) {
    console.log(...args);
  }
}

async function bootstrap() {
  try {
    Max.post(`maxID : ${globals.maxId} || verbose : ${globals.verbose} || structure : ${globals.structure}`);
  } catch(err) {
    console.log(err);
  }

  Max.post(`> client is ready!`);
  globals.ready = true;
  globals.boxes = await Max.getDict(`${globals.maxId}_modular-matrix-boxes`);
  deleteExistingBoxes();
  if (globals.structure) {
    generateMatrix();
  }

}

async function deleteExistingBoxes() {
  if (!('list' in globals.boxes)) {
    globals.boxes.list = [];
  }

  // delete previous existing boxes
  globals.boxes.list.forEach(name => {
    deleteBox(name);
  });

  globals.boxes.list = [];
}

function onList(row, col, gain) {
  Max.outlet("tomatrixctl", row, col, gain);
}

function onClear() {

}

function onGenerate(filename) {
  globals.structure = JSON5.parse(fs.readFileSync(filename));
  if (globals.structure) {
    generateMatrix();
  }
}

function generateMatrix() {
  // generate routingMatrix -> real in out
  // generate userMatrix -> simplified way with only names

  globals.structure.forEach((e, i) => {
    // user matrix
    if (e.inputs !== 0) {
      globals.userMatrix.inputs.push(e.name);
      for (let s = 1; s <= e.inputs; s++) {
        globals.routingMatrix.inputs.push(`${e.name}-in-${s}`);
      };
    };
    if (e.outputs !== 0) {
      globals.userMatrix.outputs.push(e.name);
      for (let s = 1; s <= e.outputs; s++) {
        globals.routingMatrix.outputs.push(`${e.name}-out-${s}`);
      };
    };
  });

  globals.userMatrix.inputs.forEach((e, i) => {
    globals.userMatrix.initwith += `/row/${i+1}/label ${e}, `;
  })
  globals.userMatrix.outputs.forEach((e, i) => {
    globals.userMatrix.initwith += `/col/${i+1}/label ${e}, `;
  })
  globals.routingMatrix.inputs.forEach((e, i) => {
    globals.routingMatrix.initwith += `/row/${i+1}/label ${e}, `;
  })
  globals.routingMatrix.outputs.forEach((e, i) => {
    globals.routingMatrix.initwith += `/col/${i+1}/label ${e}, `;
  })

  // console.log(globals.userMatrix, globals.routingMatrix);

  generateBox('user_matrix_routing', 'spat5.matrix', ['@inputs', globals.userMatrix.inputs.length, '@outputs', globals.userMatrix.outputs.length, '@initwith', `"${globals.userMatrix.initwith}"`], { x: 400, y: 260 }, 1);
  generateBox('routing_matrix_routing', 'spat5.matrix', ['@inputs', globals.routingMatrix.inputs.length, '@outputs', globals.routingMatrix.outputs.length, '@initwith', `"${globals.routingMatrix.initwith}"`], { x: 20, y: 120 }, 1);

  generateBox('matrix', 'matrix~', [globals.routingMatrix.inputs.length, globals.routingMatrix.outputs.length, '1.', `@ramp ${globals.ramp}`], { x: 40, y: 190 }, 0);
  generateBox('matrix_unpack', 'mc.unpack~', [globals.routingMatrix.inputs.length], { x: 20, y:30 }, 0);
  generateBox('matrix_pack', 'mc.pack~', [globals.routingMatrix.outputs.length], { x: 20, y:280 }, 0);

  generateLink('user_matrix_routing', 0, 'user_matrix_out', 0);
  generateLink('routing_matrix_in', 0, 'routing_matrix_routing', 0);
  generateLink('matrix_pack', 0, 'mc-outlet', 0);
  generateLink('routing_matrix_in', 0, 'matrix', 0);
  generateLink('user_matrix_in', 0, 'user_matrix_routing', 0);

  // generate receive boxes
  globals.routingMatrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, 'receive~', [name], { x: (40 + index * 120), y: 150 }, 0);
    generateLink(`recv-${name}`, 0, 'matrix', index);
    generateLink('matrix_unpack', index, 'matrix', index);
    if (index === 0) {
      generateLink('route_mtrx', 0, 'matrix_unpack', 0);
    }
  });

  globals.routingMatrix.outputs.forEach((name, index) => {
    generateBox(`send-${name}`, 'send~', [name], { x: (40 + index * 120), y: 230 }, 0);
    generateLink('matrix', index, `send-${name}`, 0);
    generateLink('matrix', index, 'matrix_pack', index);
  });

}

function onRouting(row, col, gain) {
  const userMatrixInput = globals.userMatrix.inputs[row];
  const userMatrixOutput = globals.userMatrix.outputs[col];

  const userMatrixInputNumber = globals.structure.find(e => e.name === userMatrixInput).inputs;
  const userMatrixOutputNumber = globals.structure.find(e => e.name === userMatrixOutput).outputs;

  const mixingLaw = mixing[userMatrixInputNumber][userMatrixOutputNumber];

  const routingMatrixIndexInput = [];
  const routingMatrixIndexOutput = [];

  for (let i = 1; i <= userMatrixInputNumber; i++) {
    const index = globals.routingMatrix.inputs.findIndex(e => e === `${userMatrixInput}-in-${i}`);
    routingMatrixIndexInput.push(index);
  }

  for (let i = 1; i <= userMatrixOutputNumber; i++) {
    const index = globals.routingMatrix.outputs.findIndex(e => e === `${userMatrixOutput}-out-${i}`);
    routingMatrixIndexOutput.push(index);
  }

  routingMatrixIndexInput.forEach((inputNumber, inputIndex) => {
    routingMatrixIndexOutput.forEach((outputNumber, outputIndex) => {
      if (mixingLaw.length !== 0) {
        Max.outlet("tomatrix",
          inputNumber, outputNumber, gain * mixingLaw[outputIndex][inputIndex]
        );
      }
    });
  });
}

function onMessage(...args) {
  const cmd = args[0];
  if (handledMessages.includes(cmd)) {
    return;
  }
  console.log(...args);
}

// -------------------------------------------------------
// HANDLERS
// -------------------------------------------------------

function onDebug(verbose) {
  globals.verbose = !!verbose;
  Max.outlet("debug", globals.verbose);
}

function generateBox(varName, boxName, args, position, presentation, presentationPosition = {x:0, y:0}, comment) {
  globals.boxes.list.push(varName);
  const textArgs = `${boxName} ${args.join(' ')}`;

  // const msg = `script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation_position ${presentationPosition.x} ${presentationPosition.y} @presentation ${presentation} @comment ${comment}`;

  Max.outlet("thispatcher", "script", "newobject", "newobj", "@text", textArgs, "@varname", varName, "@patching_position", position.x, position.y, "@presentation_position", presentationPosition.x, presentationPosition.y, "@presentation", presentation, "@comment", comment);
  Max.setDict(`${globals.maxId}_modular-matrix-boxes`, globals.boxes);
}

function deleteBox(varName) {
  Max.outlet("thispatcher", "script", "delete", varName);
}

function generateLink(varNameOut, outlet, varNameIn, inlet) {
  Max.outlet("thispatcher", "script", "connect", varNameOut, outlet, varNameIn, inlet);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------


// -------------------------------------------------------
// Notify that the script is ready and
// that bootstrap can be called
// -------------------------------------------------------
Max.outletBang();

