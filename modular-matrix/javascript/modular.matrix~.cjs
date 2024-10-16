var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/modular-matrix~.js
var import_max_api = __toESM(require("max-api"));

// src/mixing.js
var eye = (n) => [...Array(n)].map((e, i2, a) => a.map((e2) => +!i2--));
function disableConnectionWithName(inputName, outputName, globals2) {
  if (inputName === outputName) {
    return true;
  } else {
    return false;
  }
}
function getNumChannelsFromInputName(inputName, globals2) {
  let inputStructure = globals2.structure.inputs.find((e) => e.name === inputName);
  if (inputStructure === void 0) {
    inputStructure = globals2.structure.objects.find((e) => e.name === inputName);
  }
  const inputNumber = inputStructure.inputs;
  return inputNumber;
}
function getNumChannelsFromOutputName(outputName, globals2) {
  let outputStructure = globals2.structure.outputs.find((e) => e.name === outputName);
  if (outputStructure === void 0) {
    outputStructure = globals2.structure.objects.find((e) => e.name === outputName);
  }
  if (outputStructure === void 0) {
    return null;
  }
  const outputNumber = outputStructure.outputs;
  return outputNumber;
}
function getIndexesFromNames(inputName, outputName, globals2) {
  const inputIndex = globals2.userMatrix.inputs.findIndex((e) => e === inputName);
  const outputIndex = globals2.userMatrix.outputs.findIndex((e) => e === outputName);
  return { inputIndex, outputIndex };
}
function allowConnectionWithName(inputName, outputName, globals2) {
  const inputNumber = getNumChannelsFromInputName(inputName, globals2);
  const outputNumber = getNumChannelsFromOutputName(outputName, globals2);
  if (inputName === outputName) {
    return false;
  }
  if (getMixingLaw(inputNumber, outputNumber) === null) {
    return false;
  } else {
    return true;
  }
}
function allowConnectionWithIndex(inputIndex, outputIndex, globals2) {
  const inputName = globals2.userMatrix.inputs[inputIndex];
  const outputName = globals2.userMatrix.outputs[outputIndex];
  return allowConnectionWithName(inputName, outputName, globals2);
}
function getMixingLaw(inputNumber, outputNumber) {
  if (inputNumber < outputNumber) {
    if (Number.isInteger(outputNumber / inputNumber)) {
      const outputArray = [];
      const numOfDup = outputNumber / inputNumber;
      const unitMatrix = eye(inputNumber);
      for (i = 0; i < numOfDup; i++) {
        unitMatrix.forEach((e) => {
          outputArray.push(e);
        });
      }
      return outputArray;
    } else {
      return null;
    }
  } else if (inputNumber > outputNumber) {
    if (Number.isInteger(inputNumber / outputNumber)) {
      const outputArray = [];
      const numOfDup = inputNumber / outputNumber;
      const unitMatrix = eye(outputNumber);
      unitMatrix.forEach((line) => {
        const intermediateArray = [];
        for (i = 0; i < numOfDup; i++) {
          line.forEach((e) => {
            intermediateArray.push(e);
          });
        }
        outputArray.push(intermediateArray);
      });
      return outputArray;
    } else {
      return null;
    }
  } else {
    return eye(inputNumber);
  }
}

// node_modules/@ircam/sc-utils/src/is-browser.js
var isBrowser = new Function("try {return this===window;}catch(e){ return false;}");

// node_modules/@ircam/sc-gettime/src/node.js
var import_node_process = require("node:process");
var start = import_node_process.hrtime.bigint();

// node_modules/@ircam/sc-utils/src/atodb.js
function atodb(val) {
  return 8.685889638065035 * Math.log(val);
}

// node_modules/@ircam/sc-utils/src/dbtoa.js
function dbtoa(val) {
  return Math.exp(0.11512925464970229 * val);
}

// node_modules/@ircam/sc-utils/src/linear-scale.js
function linearScale(minIn, maxIn, minOut, maxOut, clamp = false) {
  const a = (maxOut - minOut) / (maxIn - minIn);
  const b = minOut - a * minIn;
  if (!clamp) {
    return (x) => a * x + b;
  } else {
    const upperBound = Math.max(minOut, maxOut);
    const lowerBound = Math.min(minOut, maxOut);
    return (x) => {
      const y = a * x + b;
      return Math.max(lowerBound, Math.min(upperBound, y));
    };
  }
}

// src/modular-matrix~.js
var globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  file: null,
  userMatrix: { inputs: [], outputs: [], initwith: "", connections: [] },
  routingMatrix: { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: "" }, connections: [] },
  timeoutMap: []
};
import_max_api.default.addHandlers({
  [import_max_api.default.MESSAGE_TYPES.BANG]: () => {
  },
  [import_max_api.default.MESSAGE_TYPES.LIST]: (row, col, gain, time) => onList(row, col, gain, time),
  [import_max_api.default.MESSAGE_TYPES.NUMBER]: (num) => {
  },
  [import_max_api.default.MESSAGE_TYPES.DICT]: (dict) => onDict(dict),
  debug: (verbose) => onDebug(verbose),
  maxId: (maxId) => globals.maxId = maxId,
  ramp: (ramp) => onRamp(ramp),
  done: () => bootstrap(),
  generate: (dict) => onConfigDict(dict),
  file: (filename) => onConfigDictName(filename),
  routing: (row, col, gain) => onRouting(row, col, gain),
  clear: () => onClear(),
  open: () => onOpen(),
  patch: (input, output, gain, time) => onPatch(input, output, gain, time),
  dumpconnections: () => dumpConnections(),
  dumppatch: () => dumpPatch(),
  set: (row, col, gain) => onList(row, col, gain),
  [import_max_api.default.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args)
});
var handledMessages = ["debug", "maxId", "ramp", "done", "generate", "structure", "routing", "clear", "list", "patch", "dumpconnections", "dumppatch", "dict", "file", "open", "set"];
async function bootstrap() {
  try {
  } catch (err) {
    console.log(err);
  }
  globals.ready = true;
  globals.boxes = await import_max_api.default.getDict(`${globals.maxId}_modular-matrix-boxes`);
  if (globals.structure) {
    generateMatrix();
  }
}
async function deleteExistingBoxes() {
  if (!("list" in globals.boxes)) {
    globals.boxes.list = [];
  }
  globals.boxes.list.forEach((name) => {
    deleteBox(name);
  });
  globals.boxes.list = [];
  globals.userMatrix = { inputs: [], outputs: [], initwith: "", connections: [] };
  globals.routingMatrix = { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: "" }, connections: [] };
  globals.timeoutMap = [];
}
function onRamp(ramp) {
  globals.ramp = ramp;
  if (globals.ready === true) {
    import_max_api.default.outlet("tomatrix", "ramp", globals.ramp);
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
  globals.timeoutMap.forEach((timeout) => {
    clearInterval(timeout.function);
  });
  import_max_api.default.outlet("tomatrixctl", "/clear");
  setTimeout(() => {
    globals.routingMatrix.inputs.forEach((input, inputIndex) => {
      globals.routingMatrix.outputs.forEach((output, outputIndex) => {
        import_max_api.default.outlet("tomatrix", inputIndex, outputIndex, 0, 20);
      });
    });
    globals.userMatrix.connections = [];
  }, 50);
}
function onDict(dict) {
  if (dict.numins !== globals.userMatrix.inputs.length || dict.numouts !== globals.userMatrix.outputs.length) {
    import_max_api.default.post("Be careful, you're trying to recall a preset with a different matrix size");
  }
  if (!dict.patch) {
    import_max_api.default.outlet("tomatrixctl", "/clear");
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }
    dict.connections.forEach((connection) => {
      if (!allowConnectionWithIndex(connection.in, connection.out, globals)) {
        return;
      }
      import_max_api.default.outlet("tomatrixctl", connection.in, connection.out, connection.gain);
    });
  } else {
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }
    globals.timeoutMap.forEach((timeout) => {
      clearInterval(timeout.function);
    });
    import_max_api.default.outlet("tomatrixctl", "/clear");
    dict.connections.forEach((connection) => {
      if (!allowConnectionWithName(connection.in, connection.out, globals)) {
        return;
      }
      const { inputIndex, outputIndex } = getIndexesFromNames(connection.in, connection.out, globals);
      let ramptime;
      if (connection.ramptime) {
        ramptime = connection.ramptime;
      } else {
        ramptime = globals.ramp;
      }
      sendLine(inputIndex, outputIndex, dbtoa(connection.gain), ramptime);
    });
  }
}
function onOpen() {
  import_max_api.default.outlet("tomatrixctl", "/window/open");
}
function onPatch(input, output, dB, time) {
  if (!allowConnectionWithName(input, output, globals)) {
    return;
  }
  if (!time) {
    time = globals.ramp;
  }
  const { inputIndex, outputIndex } = getIndexesFromNames(input, output, globals);
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
  };
  import_max_api.default.outlet("dump", maxDict);
}
function dumpPatch() {
  const dumpConnectionArray = [];
  globals.userMatrix.connections.forEach((connection) => {
    let ramptime;
    if (connection.ramptime !== void 0) {
      ramptime = connection.ramptime;
    } else {
      ramptime = globals.ramp;
    }
    dumpConnectionArray.push({
      in: globals.userMatrix.inputs[connection.in],
      out: globals.userMatrix.outputs[connection.out],
      gain: atodb(connection.gain),
      ramptime
    });
  });
  const maxDict = {
    "numins": globals.userMatrix.inputs.length,
    "numouts": globals.userMatrix.outputs.length,
    "exclusive": 0,
    "offset": 0,
    "enablegain": 1,
    "patch": 1,
    "connections": dumpConnectionArray
  };
  import_max_api.default.outlet("dump", maxDict);
}
function sendLine(inputIndex, outputIndex, gainLin, time) {
  const connection = globals.userMatrix.connections.find((e) => e.in === inputIndex && e.out === outputIndex);
  const startValue = connection ? connection.gain : 0;
  const scaledOutput = linearScale(0, 1, startValue, gainLin);
  let output = 0;
  const tick = 20;
  let timeout = globals.timeoutMap.find((e) => e.in === inputIndex && e.out === outputIndex);
  if (timeout) {
    clearInterval(timeout.function);
    globals.timeoutMap = globals.timeoutMap.filter((e) => {
      return e !== timeout;
    });
  }
  if (time !== 0) {
    timeout = setInterval(() => {
      if (output < 1) {
        output = output + 1 / time * tick;
        import_max_api.default.outlet("tomatrixctl", inputIndex, outputIndex, scaledOutput(output));
      } else {
        output = 1;
        import_max_api.default.outlet("tomatrixctl", inputIndex, outputIndex, scaledOutput(output));
        clearInterval(timeout);
      }
    }, tick);
    globals.timeoutMap.push({
      in: inputIndex,
      out: outputIndex,
      function: timeout
    });
    const connectionIndex = globals.userMatrix.connections.findIndex((e) => e.in === inputIndex && e.out === outputIndex);
    if (connectionIndex !== -1) {
      globals.userMatrix.connections[connectionIndex].ramptime = time;
    } else {
      globals.userMatrix.connections.push({
        in: inputIndex,
        out: outputIndex,
        gain: gainLin,
        ramptime: time
      });
    }
  } else {
    import_max_api.default.outlet("tomatrixctl", inputIndex, outputIndex, gainLin);
  }
}
async function onConfigDictName(dictName) {
  globals.file = dictName;
  try {
    const structure = await import_max_api.default.getDict(globals.file);
    globals.structure = structure;
  } catch {
    console.log("configuration dict do not exist");
  }
}
async function onConfigDict(structure) {
  if (structure) {
    globals.structure = structure;
  } else {
    const structure2 = await import_max_api.default.getDict(globals.file);
    globals.structure = structure2;
  }
  if (globals.ready && globals.structure) {
    generateMatrix();
  }
}
function generateMatrix() {
  deleteExistingBoxes();
  if (globals.structure.inputs) {
    globals.structure.inputs.forEach((e, i2) => {
      if (e.inputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
        for (let s = 1; s <= e.inputs; s++) {
          globals.routingMatrix.inputs.push(`${e.name}-in-${s}`);
        }
        ;
      }
    });
  }
  ;
  if (globals.structure.outputs) {
    globals.structure.outputs.forEach((e, i2) => {
      if (e.outputs !== 0) {
        globals.userMatrix.outputs.push(e.name);
        for (let s = 1; s <= e.outputs; s++) {
          globals.routingMatrix.outputs.push(`${e.name}-out-${s}`);
        }
        ;
      }
    });
  }
  if (globals.structure.objects) {
    globals.structure.objects.forEach((e, i2) => {
      if (e.inputs !== 0 && e.outputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
        globals.userMatrix.outputs.push(e.name);
        for (let s = 1; s <= e.inputs; s++) {
          globals.routingMatrix.inputs.push(`${e.name}-in-${s}`);
        }
        ;
        for (let s = 1; s <= e.outputs; s++) {
          globals.routingMatrix.outputs.push(`${e.name}-out-${s}`);
        }
        ;
      }
    });
  }
  ;
  globals.userMatrix.inputs.forEach((e, i2) => {
    const numch = getNumChannelsFromInputName(e, globals);
    globals.userMatrix.initwith += `/row/${i2 + 1}/label ${e}(${numch}ch), `;
  });
  globals.userMatrix.outputs.forEach((e, i2) => {
    const numch = getNumChannelsFromOutputName(e, globals);
    globals.userMatrix.initwith += `/col/${i2 + 1}/label ${e}(${numch}ch), `;
  });
  globals.routingMatrix.inputs.forEach((e, i2) => {
    globals.routingMatrix.initwith += `/row/${i2 + 1}/label ${e}, `;
    globals.routingMatrix.crosspatch.inputs += `${e} `;
  });
  globals.routingMatrix.outputs.forEach((e, i2) => {
    globals.routingMatrix.initwith += `/col/${i2 + 1}/label ${e}, `;
    globals.routingMatrix.crosspatch.outputs += `${e} `;
  });
  globals.userMatrix.inputs.forEach((inputName, inputIndex) => {
    globals.userMatrix.outputs.forEach((outputName, outputIndex) => {
      if (!allowConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/editable 0, `;
      }
      if (disableConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/visible 0, `;
      }
    });
  });
  generateBox("user_matrix_routing", "spat5.matrix", ["@inputs", globals.userMatrix.inputs.length, "@outputs", globals.userMatrix.outputs.length, "@initwith", `"${globals.userMatrix.initwith}"`], { x: 400, y: 260 }, 0);
  generateBox("matrix", "matrix~", [globals.routingMatrix.inputs.length, globals.routingMatrix.outputs.length, "1.", `@ramp ${globals.ramp}`], { x: 40, y: 190 }, 0);
  generateBox("matrix_unpack", "mc.unpack~", [globals.routingMatrix.inputs.length], { x: 20, y: 30 }, 0);
  generateBox("matrix_pack", "mc.pack~", [globals.routingMatrix.outputs.length], { x: 20, y: 280 }, 0);
  generateBox("dict", "dict", [globals.file], { x: 20, y: 3 }, 0);
  generateLink("user_matrix_routing", 0, "user_matrix_out", 0);
  generateLink("matrix_pack", 0, "mc-outlet", 0);
  generateLink("routing_matrix_in", 0, "matrix", 0);
  generateLink("user_matrix_in", 0, "user_matrix_routing", 0);
  generateLink("route_mtrx", 0, "matrix_unpack", 0);
  generateLink("route_mtrx", 1, "matrix_unpack", 0);
  generateLink("route_mtrx", 2, "dict", 0);
  globals.routingMatrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, "receive~", [name], { x: 40 + index * 120, y: 150 }, 0);
    generateLink(`recv-${name}`, 0, "matrix", index);
    generateLink("matrix_unpack", index, "matrix", index);
  });
  globals.routingMatrix.outputs.forEach((name, index) => {
    generateBox(`send-${name}`, "send~", [name], { x: 40 + index * 120, y: 230 }, 0);
    generateLink("matrix", index, `send-${name}`, 0);
    generateLink("matrix", index, "matrix_pack", index);
  });
  import_max_api.default.outlet("visualize", "set", `no connections...`);
}
function onRouting(row, col, gain) {
  const userMatrixInput = globals.userMatrix.inputs[row];
  const userMatrixOutput = globals.userMatrix.outputs[col];
  const connection = globals.userMatrix.connections.find((e) => e.in === row && e.out === col);
  if (connection) {
    connection.gain = gain;
    if (gain !== 0) {
      connection.gain = gain;
    } else {
      globals.userMatrix.connections = globals.userMatrix.connections.filter((v) => {
        return v !== connection;
      });
    }
  } else {
    globals.userMatrix.connections.push({
      in: row,
      out: col,
      gain
    });
  }
  const userMatrixInputNumber = getNumChannelsFromInputName(userMatrixInput, globals);
  const userMatrixOutputNumber = getNumChannelsFromOutputName(userMatrixOutput, globals);
  if (userMatrixInputNumber === null || userMatrixOutputNumber === null) {
    return;
  }
  const mixingLaw = getMixingLaw(userMatrixInputNumber, userMatrixOutputNumber);
  const routingMatrixIndexInput = [];
  const routingMatrixIndexOutput = [];
  for (let i2 = 1; i2 <= userMatrixInputNumber; i2++) {
    const index = globals.routingMatrix.inputs.findIndex((e) => e === `${userMatrixInput}-in-${i2}`);
    routingMatrixIndexInput.push(index);
  }
  for (let i2 = 1; i2 <= userMatrixOutputNumber; i2++) {
    const index = globals.routingMatrix.outputs.findIndex((e) => e === `${userMatrixOutput}-out-${i2}`);
    routingMatrixIndexOutput.push(index);
  }
  routingMatrixIndexInput.forEach((inputNumber, inputIndex) => {
    routingMatrixIndexOutput.forEach((outputNumber, outputIndex) => {
      if (mixingLaw.length !== 0) {
        const routingGain = gain * mixingLaw[outputIndex][inputIndex];
        import_max_api.default.outlet("tomatrix", inputNumber, outputNumber, routingGain);
        setRoutingMatrixConnection(inputNumber, outputNumber, routingGain);
      }
    });
  });
  let visualize = ``;
  globals.routingMatrix.connections.forEach((connection2) => {
    visualize += `${connection2.inputName} > ${connection2.outputName} : ${Math.round(atodb(connection2.gain))}dB
`;
  });
  import_max_api.default.outlet("visualize", "set", visualize);
}
function setRoutingMatrixConnection(inputNumber, outputNumber, gain) {
  const inputName = globals.routingMatrix.inputs[inputNumber];
  const outputName = globals.routingMatrix.outputs[outputNumber];
  const connectionIndex = globals.routingMatrix.connections.findIndex((e) => e.inputName === inputName && e.outputName === outputName);
  if (gain !== 0) {
    if (connectionIndex !== -1) {
      globals.routingMatrix.connections[connectionIndex].gain = gain;
    } else {
      globals.routingMatrix.connections.push({
        inputName,
        outputName,
        gain
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
  } else if (args[0].split("")[0] === "/") {
    import_max_api.default.outlet("tomatrixctl", ...args);
  } else {
    console.log(...args);
  }
}
function onDebug(verbose) {
  globals.verbose = !!verbose;
  import_max_api.default.outlet("debug", globals.verbose);
}
function generateBox(varName, boxName, args, position, presentation, presentationPosition = { x: 0, y: 0 }, comment) {
  globals.boxes.list.push(varName);
  const textArgs = `${boxName} ${args.join(" ")}`;
  import_max_api.default.outlet("thispatcher", "script", "newobject", "newobj", "@text", textArgs, "@varname", varName, "@patching_position", position.x, position.y, "@presentation_position", presentationPosition.x, presentationPosition.y, "@presentation", presentation, "@comment", comment);
  import_max_api.default.setDict(`${globals.maxId}_modular-matrix-boxes`, globals.boxes);
}
function deleteBox(varName) {
  import_max_api.default.outlet("thispatcher", "script", "delete", varName);
}
function generateLink(varNameOut, outlet, varNameIn, inlet) {
  import_max_api.default.outlet("thispatcher", "script", "connect", varNameOut, outlet, varNameIn, inlet);
}
import_max_api.default.outletBang();
import_max_api.default.outlet("visualize", "set", `matrix~ is not generated`);
