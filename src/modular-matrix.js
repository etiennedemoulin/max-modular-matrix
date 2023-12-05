import path from 'node:path';
import fs from 'node:fs';
import Max from 'max-api';
import JSON5 from 'json5';
import { getMixingLaw, allowConnectionWithName, allowConnectionWithIndex, getNumChannelsFromInputName, getNumChannelsFromOutputName, getIndexesFromNames, disableConnectionWithName } from './mixing.js';
import { dbtoa, linearScale, atodb } from '@ircam/sc-utils';

const globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  file: null,
  userMatrix: { inputs: [], outputs: [], initwith: "", connections: []},
  routingMatrix: { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: ""}, connections: []},
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
  generate: (dict) => onConfigDict(dict),
  file: (filename) => onConfigDictName(filename),
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

  // clear config
  globals.userMatrix = { inputs: [], outputs: [], initwith: "", connections: []};
  globals.routingMatrix = { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: ""}, connections: []};
  globals.timeoutMap = [];

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

      const { inputIndex, outputIndex } = getIndexesFromNames(connection.in, connection.out, globals);
      // const inputIndex = globals.userMatrix.inputs.findIndex(e => e === connection.in);
      // const outputIndex = globals.userMatrix.outputs.findIndex(e => e === connection.out);

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
  const { inputIndex, outputIndex } = getIndexesFromNames(input, output, globals);
  // const inputIndex = globals.userMatrix.inputs.findIndex(e => e === input);
  // const outputIndex = globals.userMatrix.outputs.findIndex(e => e === output);
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
        gain:gainLin,
        ramptime:time
      });
    }

  } else {
    Max.outlet("tomatrixctl", inputIndex, outputIndex, gainLin);
  }

}

async function onConfigDictName(dictName) {
  globals.file = dictName;
  try {
    const structure = await Max.getDict(globals.file);
    globals.structure = structure;
  } catch {
    console.log("configuration dict do not exist");
  }
}

async function onConfigDict(structure) {
  if (structure) {
    globals.structure = structure;
  } else {
    const structure = await Max.getDict(globals.file);
    globals.structure = structure;
  }

  if (globals.ready && globals.structure) {
    generateMatrix();
  }
}

function generateMatrix() {
  deleteExistingBoxes();
  // generate routingMatrix -> real in out
  // generate userMatrix -> simplified way with only names
  if (globals.structure.inputs) {
    globals.structure.inputs.forEach((e, i) => {
      // user matrix
      if (e.inputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
        for (let s = 1; s <= e.inputs; s++) {
            globals.routingMatrix.inputs.push(`${e.name}-in-${s}`);
        };
      }
    });
  };

  if (globals.structure.outputs) {
    globals.structure.outputs.forEach((e, i) => {
      if (e.outputs !== 0) {
        globals.userMatrix.outputs.push(e.name);
        for (let s = 1; s <= e.outputs; s++) {
          globals.routingMatrix.outputs.push(`${e.name}-out-${s}`);
        };
      }
    });
  }

  if (globals.structure.objects) {
    globals.structure.objects.forEach((e, i) => {
      if (e.inputs !== 0 && e.outputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
        globals.userMatrix.outputs.push(e.name);
        for (let s = 1; s <= e.inputs; s++) {
            globals.routingMatrix.inputs.push(`${e.name}-in-${s}`);
        };
        for (let s = 1; s <= e.outputs; s++) {
          globals.routingMatrix.outputs.push(`${e.name}-out-${s}`);
        };
      }
    });
  };

  globals.userMatrix.inputs.forEach((e, i) => {
    const numch = getNumChannelsFromInputName(e, globals);
    globals.userMatrix.initwith += `/row/${i+1}/label ${e}(${numch}ch), `;
  })
  globals.userMatrix.outputs.forEach((e, i) => {
    const numch = getNumChannelsFromOutputName(e, globals);
    globals.userMatrix.initwith += `/col/${i+1}/label ${e}(${numch}ch), `;
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
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/editable 0, `;
      }
      if (disableConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/visible 0, `;
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
  generateBox('dict', 'dict', [globals.file], {x: 20, y: 3 }, 0);

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

  Max.outlet("visualize", "set", `no connections...`);

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
      });
    }
  } else {
    // create connection
    globals.userMatrix.connections.push({
      in:row,
      out:col,
      gain:gain
    });
  }

  const userMatrixInputNumber = getNumChannelsFromInputName(userMatrixInput, globals);
  const userMatrixOutputNumber = getNumChannelsFromOutputName(userMatrixOutput, globals);
  if (userMatrixInputNumber === null || userMatrixOutputNumber === null) {
    return;
  }

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
        const routingGain = gain * mixingLaw[outputIndex][inputIndex];
        Max.outlet("tomatrix", inputNumber, outputNumber, routingGain);
        setRoutingMatrixConnection(inputNumber, outputNumber, routingGain);
      }
    });
  });

  let visualize = ``;
  globals.routingMatrix.connections.forEach(connection => {
    visualize += `${connection.inputName} > ${connection.outputName} : ${Math.round(atodb(connection.gain))}dB\n`;
  })
  Max.outlet("visualize", "set", visualize);

}

function setRoutingMatrixConnection(inputNumber, outputNumber, gain) {
  const inputName = globals.routingMatrix.inputs[inputNumber];
  const outputName = globals.routingMatrix.outputs[outputNumber];

  const connectionIndex = globals.routingMatrix.connections.findIndex(e => e.inputName === inputName && e.outputName === outputName);
  if (gain !== 0) {
    if (connectionIndex !== -1) {
      globals.routingMatrix.connections[connectionIndex].gain = gain;
    } else {
      globals.routingMatrix.connections.push({
        inputName: inputName,
        outputName: outputName,
        gain: gain
      });
    }
  } else {
    globals.routingMatrix.connections = globals.routingMatrix.connections.filter((v, index) => {
      return index !== connectionIndex;
    });
  }
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
Max.outlet("visualize", "set", `matrix~ is not generated`);

