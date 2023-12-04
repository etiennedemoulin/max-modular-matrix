import path from 'node:path';
import fs from 'node:fs';
import Max from 'max-api';
import JSON5 from 'json5';
import { getMixingLaw, allowConnectionWithName, allowConnectionWithIndex } from './mixing.js';
import { dbtoa, linearScale, atodb } from '@ircam/sc-utils';

const globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  filepath: { absolute : null, relative: null, name: null },
  userMatrix: { inputs: [], outputs: [], initwith: "", connections: []},
  routingMatrix: { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: ""}},
  timeoutMap: [],
};

Max.addHandlers({
  [Max.MESSAGE_TYPES.BANG]: () => {},
  [Max.MESSAGE_TYPES.LIST]: (row, col, gain, time) => onList(row, col, gain, time),
  [Max.MESSAGE_TYPES.NUMBER]: (num) => {},
  [Max.MESSAGE_TYPES.DICT]: (dict) => onDict(dict),
  debug: (verbose) => onDebug(verbose),
  maxId: (maxId) => globals.maxId = maxId,
  ramp: (ramp) => onRamp(ramp),
  done: () => bootstrap(),
  generate: (filename) => onFile(filename, true),
  file: (filename) => onFile(filename, false),
  routing: (row, col, gain) => onRouting(row, col, gain),
  clear: () => onClear(),
  patch: (input, output, gain, time) => onPatch(input, output, gain, time),
  dumpconnections: () => dumpConnections(),
  dumppatch: () => dumpPatch(),
  open: () => onOpen(),
  set: (row, col, gain) => onList(row, col, gain),
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
});

const handledMessages = ['debug', 'maxId', 'ramp', 'done', 'generate', 'structure', 'routing', 'clear', 'list', 'patch', 'dumpconnections', 'dumppatch', 'dict', 'file', 'open', 'set'];

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

function onList(row, col, gain, time) {
  if (!allowConnectionWithIndex(row, col, globals)) {
    return;
  }
  if (!time) {
    time = globals.ramp;
  }
  sendLine(row, col, gain, time);
}

function onClear() {

  // clear all currents ramps
  globals.timeoutMap.forEach(timeout => {
    clearInterval(timeout.function);
  });

  // clear GUI (smooth clearing)
  Max.outlet("tomatrixctl", "/clear");

  // clear matrix~ directly (hard clearing)
  setTimeout(() => {
    globals.routingMatrix.inputs.forEach((input, inputIndex) => {
      globals.routingMatrix.outputs.forEach((output, outputIndex) => {
        Max.outlet("tomatrix", inputIndex, outputIndex, 0, 20);
      })
    });

    // remove connections
    globals.userMatrix.connections = [];
  }, 50);
}

function onDict(dict) {
  if (dict.numins !== globals.userMatrix.inputs.length || dict.numouts !== globals.userMatrix.outputs.length) {
    Max.post("Be careful, you're trying to recall a preset with a different matrix size");
  }

  if (!dict.patch) {
    // classic dict support

    // smooth clearing
    Max.outlet("tomatrixctl", "/clear");

    // setting global ramp time
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }

    // making connection
    dict.connections.forEach(connection => {
      if (!allowConnectionWithIndex(connection.in, connection.out, globals)) {
        return;
      }
      Max.outlet("tomatrixctl", connection.in, connection.out, connection.gain);
    });
  } else {
    // names and dB dict support

    // set new global ramp time
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }

    // clear all current ramps
    globals.timeoutMap.forEach(timeout => {
      clearInterval(timeout.function);
    });

    // smooth clearing
    Max.outlet("tomatrixctl", "/clear");

    // making connections
    dict.connections.forEach(connection => {
      if (!allowConnectionWithName(connection.in, connection.out, globals)) {
        return;
      }

      const inputIndex = globals.userMatrix.inputs.findIndex(e => e === connection.in);
      const outputIndex = globals.userMatrix.outputs.findIndex(e => e === connection.out);

      // compute individual ramptime
      let ramptime;
      if (connection.ramptime) {
        ramptime = connection.ramptime;
      } else {
        ramptime = globals.ramp;
      }

      sendLine(inputIndex, outputIndex, dbtoa(connection.gain), ramptime);
    })
  }
}

function onOpen() {
  Max.outlet("tomatrixctl", "/window/open");
}

function onPatch(input, output, dB, time) {
  if (!allowConnectionWithName(input, output, globals)) {
    return;
  }
  if (!time) {
    time = globals.ramp;
  }
  const inputIndex = globals.userMatrix.inputs.findIndex(e => e === input);
  const outputIndex = globals.userMatrix.outputs.findIndex(e => e === output);
  const gainLin = dbtoa(dB);
  sendLine(inputIndex, outputIndex, gainLin, time);
}

function dumpConnections() {
  const maxDict = {
    "numins": globals.userMatrix.inputs.length,
    "numouts": globals.userMatrix.outputs.length,
    "exclusive": 0,
    "offset": 0,
    "enablegain": 1,
    "ramptime": globals.ramp,
    "connections": globals.userMatrix.connections
  }
  Max.outlet("dump", maxDict);
}

function dumpPatch() {
  const dumpConnectionArray = [];
  globals.userMatrix.connections.forEach(connection => {
    let ramptime;
    if (connection.ramptime !== undefined) {
      ramptime = connection.ramptime;
    } else {
      ramptime = globals.ramp;
    }
    dumpConnectionArray.push({
      in: globals.userMatrix.inputs[connection.in],
      out: globals.userMatrix.outputs[connection.out],
      gain: atodb(connection.gain),
      ramptime: ramptime
    });
  })
  const maxDict = {
    "numins": globals.userMatrix.inputs.length,
    "numouts": globals.userMatrix.outputs.length,
    "exclusive": 0,
    "offset": 0,
    "enablegain": 1,
    "patch" : 1,
    "connections": dumpConnectionArray
  }
  Max.outlet("dump", maxDict);
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

  if (time !== 0) {
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
    // store interval function
    globals.timeoutMap.push({
      in: inputIndex,
      out: outputIndex,
      function: timeout
    });

    const connectionIndex = globals.userMatrix.connections.findIndex(e => e.in === inputIndex && e.out === outputIndex);
    if (connectionIndex !== -1) {
      // change ramptime
      globals.userMatrix.connections[connectionIndex].ramptime = time;
    } else {
      // pre-create connection with ramptime argument
      globals.userMatrix.connections.push({
        in:inputIndex,
        out:outputIndex,
        gain:atodb(gainLin),
        ramptime:time
      });
    }

  } else {
    Max.outlet("tomatrixctl", inputIndex, outputIndex, gainLin);
  }

}

function onFile(filename, generate = false) {
  globals.filepath.absolute = filename;
  const json5file = JSON5.parse(fs.readFileSync(globals.filepath.absolute));
  globals.structure = json5file.matrix;
  const relative = filename.split('/').pop()
  globals.filepath.relative = relative;
  globals.filepath.name = relative.split('.').shift();

  // replace json5 file with fully Max compatible JSON file

  fs.writeFileSync(
    globals.filepath.absolute,
    JSON.stringify(
      json5file,
      null,
      ' '
    )
  );

  if (globals.structure && generate === true) {
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

  globals.userMatrix.inputs.forEach((inputName, inputIndex) => {
    globals.userMatrix.outputs.forEach((outputName, outputIndex) => {
      if (!allowConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/editable 0`;
      }
    })
  })

  // console.log(globals.userMatrix, globals.routingMatrix);

  generateBox('user_matrix_routing', 'spat5.matrix', ['@inputs', globals.userMatrix.inputs.length, '@outputs', globals.userMatrix.outputs.length, '@initwith', `"${globals.userMatrix.initwith}"`], { x: 400, y: 260 }, 0);
  generateBox('routing_matrix_routing', 'spat5.matrix', ['@inputs', globals.routingMatrix.inputs.length, '@outputs', globals.routingMatrix.outputs.length, '@initwith', `"${globals.routingMatrix.initwith}"`], { x: 20, y: 120 }, 0);

  generateBox('matrix', 'matrix~', [globals.routingMatrix.inputs.length, globals.routingMatrix.outputs.length, '1.', `@ramp ${globals.ramp}`], { x: 40, y: 190 }, 0);
  generateBox('matrix_unpack', 'mc.unpack~', [globals.routingMatrix.inputs.length], { x: 20, y:30 }, 0);
  generateBox('matrix_pack', 'mc.pack~', [globals.routingMatrix.outputs.length], { x: 20, y:280 }, 0);
    // generate configuration dict
  generateBox('dict', 'dict', [globals.filepath.name, globals.filepath.relative], {x: 20, y: 3 }, 0);

  generateLink('user_matrix_routing', 0, 'user_matrix_out', 0);
  generateLink('matrix_pack', 0, 'mc-outlet', 0);
  generateLink('routing_matrix_in', 0, 'matrix', 0);
  generateLink('user_matrix_in', 0, 'user_matrix_routing', 0);
  generateLink('route_mtrx', 0, 'matrix_unpack', 0);
  generateLink('route_mtrx', 1, 'matrix_unpack', 0);
  // generateLink('user_matrix_open', 0, 'user_matrix_routing', 0);
  // generateLink('routing_matrix_open', 0, 'routing_matrix_routing', 0);
  generateLink('routing_matrix_filter', 1, 'routing_matrix_routing', 0);
  generateLink('route_mtrx', 2, 'dict', 0);

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
    // connection exist , change
    connection.gain = gain;
    if (gain !== 0) {
      connection.gain = gain;
    } else {
      globals.userMatrix.connections = globals.userMatrix.connections.filter((v) => {
        return v !== connection;
      })
    }
  } else {
    // create connection
    globals.userMatrix.connections.push({
      in:row,
      out:col,
      gain:gain
    });
  }

  const userMatrixInputNumber = globals.structure.find(e => e.name === userMatrixInput).inputs;
  const userMatrixOutputNumber = globals.structure.find(e => e.name === userMatrixOutput).outputs;

  const mixingLaw = getMixingLaw(userMatrixInputNumber, userMatrixOutputNumber);
  // const mixingLaw = mixing[userMatrixInputNumber][userMatrixOutputNumber];

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

