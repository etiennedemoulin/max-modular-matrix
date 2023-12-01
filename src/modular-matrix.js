import path from 'node:path';
import fs from 'node:fs';
import Max from 'max-api';
import JSON5 from 'json5';
import { mixing } from './mixing.js';
import { dbtoa, linearScale } from '@ircam/sc-utils';

const globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  userMatrix: { inputs: [], outputs: [], initwith: "", connections: []},
  routingMatrix: { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: ""}},
  timeoutMap: [],
};

Max.addHandlers({
  [Max.MESSAGE_TYPES.BANG]: () => {},
  [Max.MESSAGE_TYPES.LIST]: (row, col, gain) => onList(row, col, gain),
  [Max.MESSAGE_TYPES.NUMBER]: (num) => {},
  [Max.MESSAGE_TYPES.DICT]: (dict) => onDict(dict),
  debug: (verbose) => onDebug(verbose),
  maxId: (maxId) => globals.maxId = maxId,
  ramp: (ramp) => onRamp(ramp),
  done: () => bootstrap(),
  generate: (filename) => onGenerate(filename),
  file: (filename) => globals.structure = JSON5.parse(fs.readFileSync(filename)),
  routing: (row, col, gain) => onRouting(row, col, gain),
  clear: () => onClear(),
  connect: (input, output, gain, time) => onConnect(input, output, gain, time),
  dumpconnections: () => dump(),
  open: () => onOpen(),
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
});

const handledMessages = ['debug', 'maxId', 'ramp', 'done', 'generate', 'structure', 'routing', 'clear', 'list', 'connect', 'dumpconnections', 'dict', 'file', 'open'];

function log(...args) {
  if (globals.verbose) {
    console.log(...args);
  }
}

async function bootstrap() {
  try {
    // Max.post(`maxID : ${globals.maxId} || verbose : ${globals.verbose} || structure : ${globals.structure} || ramp ${globals.ramp}`);
  } catch(err) {
    console.log(err);
  }

  // Max.post(`> client is ready!`);
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

function onRamp(ramp) {
  globals.ramp = ramp;
  if (globals.ready === true) {
    Max.outlet("tomatrix", "ramp", globals.ramp);
  }
}

function onList(row, col, gain) {
  Max.outlet("tomatrixctl", row, col, gain);
}

function onClear() {
  globals.userMatrix.inputs.forEach((input, inputIndex) => {
    globals.userMatrix.outputs.forEach((output, outputIndex) => {
      Max.outlet("tomatrixctl", inputIndex, outputIndex, 0);
    })
  });
  globals.routingMatrix.inputs.forEach((input, inputIndex) => {
    globals.routingMatrix.outputs.forEach((output, outputIndex) => {
      Max.outlet("tomatrix", inputIndex, outputIndex, 0);
    })
  });
  globals.userMatrix.connections = [];
}

function onDict(dict) {
  onClear();
  if (dict.numins !== globals.userMatrix.inputs.length || dict.numouts !== globals.userMatrix.outputs.length) {
    Max.post("Be careful, you're trying to recall a preset without the same matrix size");
  }
  if (dict.ramptime) {
    onRamp(dict.ramptime);
  }
  dict.connections.forEach(connection => {
    Max.outlet("tomatrixctl", connection.in, connection.out, connection.gain);
  })
}

function onOpen() {
  Max.outlet("tomatrixctl", "/window/open");
}

function onConnect(input, output, dB, time) {
  const inputIndex = globals.userMatrix.inputs.findIndex(e => e === input);
  const outputIndex = globals.userMatrix.outputs.findIndex(e => e === output);
  const gainLin = dbtoa(dB);
  if (time) {
    sendLine(inputIndex, outputIndex, gainLin, time)
  } else {
    Max.outlet("tomatrixctl", inputIndex, outputIndex, gainLin);
  }
}

function dump() {
  const maxDict = {
    "numins": globals.userMatrix.inputs.length,
    "numouts": globals.userMatrix.outputs.length,
    "exclusive": 0,
    "offset": 0,
    "enablegain": 1,
    "ramptime": globals.ramp,
    "connections": globals.userMatrix.connections
  }
  Max.outlet("dict", maxDict);
}

function sendLine(inputIndex, outputIndex, gainLin, time) {
  const connection = globals.userMatrix.connections.find(e => e.in === inputIndex && e.out === outputIndex);

  const startValue = connection ? connection.gain : 0;

  const scaledOutput = linearScale(0, 1, startValue, gainLin);

  let output = 0;
  const tick = 20; // ms

  let timeout = globals.timeoutMap.find((e) => e.in === inputIndex && e.out === outputIndex);
  if (timeout) {
    clearInterval(timeout.function);
    globals.timeoutMap = globals.timeoutMap.filter(e => {return e !== timeout});
  }

  timeout = setInterval(() => {
    if (output < 1) {
      output = output + (1 / time * tick);
      Max.outlet("tomatrixctl", inputIndex, outputIndex, scaledOutput(output));
    } else {
      output = 1;
      Max.outlet("tomatrixctl", inputIndex, outputIndex, scaledOutput(output));
      clearInterval(timeout);
    }
  }, tick);
  globals.timeoutMap.push({
    in: inputIndex,
    out: outputIndex,
    function: timeout
  });
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
    globals.routingMatrix.crosspatch.inputs += `${e} `;
  })
  globals.routingMatrix.outputs.forEach((e, i) => {
    globals.routingMatrix.initwith += `/col/${i+1}/label ${e}, `;
    globals.routingMatrix.crosspatch.outputs += `${e} `;
  })

  // console.log(globals.userMatrix, globals.routingMatrix);

  generateBox('user_matrix_routing', 'spat5.matrix', ['@inputs', globals.userMatrix.inputs.length, '@outputs', globals.userMatrix.outputs.length, '@initwith', `"${globals.userMatrix.initwith}"`], { x: 400, y: 260 }, 0);
  generateBox('routing_matrix_routing', 'spat5.matrix', ['@inputs', globals.routingMatrix.inputs.length, '@outputs', globals.routingMatrix.outputs.length, '@initwith', `"${globals.routingMatrix.initwith}"`], { x: 20, y: 120 }, 0);

  generateBox('matrix', 'matrix~', [globals.routingMatrix.inputs.length, globals.routingMatrix.outputs.length, '1.', `@ramp ${globals.ramp}`], { x: 40, y: 190 }, 0);
  generateBox('matrix_unpack', 'mc.unpack~', [globals.routingMatrix.inputs.length], { x: 20, y:30 }, 0);
  generateBox('matrix_pack', 'mc.pack~', [globals.routingMatrix.outputs.length], { x: 20, y:280 }, 0);

  generateLink('user_matrix_routing', 0, 'user_matrix_out', 0);
  generateLink('matrix_pack', 0, 'mc-outlet', 0);
  generateLink('routing_matrix_in', 0, 'matrix', 0);
  generateLink('user_matrix_in', 0, 'user_matrix_routing', 0);
  generateLink('route_mtrx', 0, 'matrix_unpack', 0);
  generateLink('route_mtrx', 1, 'matrix_unpack', 0);
  // generateLink('user_matrix_open', 0, 'user_matrix_routing', 0);
  // generateLink('routing_matrix_open', 0, 'routing_matrix_routing', 0);
  generateLink('routing_matrix_filter', 1, 'routing_matrix_routing', 0);

  // generate receive boxes
  globals.routingMatrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, 'receive~', [name], { x: (40 + index * 120), y: 150 }, 0);
    generateLink(`recv-${name}`, 0, 'matrix', index);
    generateLink('matrix_unpack', index, 'matrix', index);
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


  const connection = globals.userMatrix.connections.find(e => e.in === row && e.out === col);
  if (connection) {
    connection.gain = gain;
    if (gain !== 0) {
      connection.gain = gain;
    } else {
      globals.userMatrix.connections = globals.userMatrix.connections.filter((v) => {
        return v !== connection;
      })
    }
    // connection exist , change
  } else {
    globals.userMatrix.connections.push({
      in:row,
      out:col,
      // inName:userMatrixInput,
      // outName:userMatrixOutput,
      gain:gain,
      line:null,
    });
    // create connection
  }

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

  // dump();

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

