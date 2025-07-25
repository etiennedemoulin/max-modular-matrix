import {createRequire} from 'module';
const require = createRequire(import.meta.url);
    
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// node_modules/number-precision/build/index.js
var require_build = __commonJS({
  "node_modules/number-precision/build/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function strip(num, precision) {
      if (precision === void 0) {
        precision = 15;
      }
      return +parseFloat(Number(num).toPrecision(precision));
    }
    function digitLength(num) {
      var eSplit = num.toString().split(/[eE]/);
      var len = (eSplit[0].split(".")[1] || "").length - +(eSplit[1] || 0);
      return len > 0 ? len : 0;
    }
    function float2Fixed(num) {
      if (num.toString().indexOf("e") === -1) {
        return Number(num.toString().replace(".", ""));
      }
      var dLen = digitLength(num);
      return dLen > 0 ? strip(Number(num) * Math.pow(10, dLen)) : Number(num);
    }
    function checkBoundary(num) {
      if (_boundaryCheckingState) {
        if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
          console.warn(num + " is beyond boundary when transfer to integer, the results may not be accurate");
        }
      }
    }
    function createOperation(operation) {
      return function() {
        var nums = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          nums[_i] = arguments[_i];
        }
        var first = nums[0], others = nums.slice(1);
        return others.reduce(function(prev, next) {
          return operation(prev, next);
        }, first);
      };
    }
    var times = createOperation(function(num1, num2) {
      var num1Changed = float2Fixed(num1);
      var num2Changed = float2Fixed(num2);
      var baseNum = digitLength(num1) + digitLength(num2);
      var leftValue = num1Changed * num2Changed;
      checkBoundary(leftValue);
      return leftValue / Math.pow(10, baseNum);
    });
    var plus = createOperation(function(num1, num2) {
      var baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
      return (times(num1, baseNum) + times(num2, baseNum)) / baseNum;
    });
    var minus = createOperation(function(num1, num2) {
      var baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
      return (times(num1, baseNum) - times(num2, baseNum)) / baseNum;
    });
    var divide = createOperation(function(num1, num2) {
      var num1Changed = float2Fixed(num1);
      var num2Changed = float2Fixed(num2);
      checkBoundary(num1Changed);
      checkBoundary(num2Changed);
      return times(num1Changed / num2Changed, strip(Math.pow(10, digitLength(num2) - digitLength(num1))));
    });
    function round(num, decimal) {
      var base = Math.pow(10, decimal);
      var result = divide(Math.round(Math.abs(times(num, base))), base);
      if (num < 0 && result !== 0) {
        result = times(result, -1);
      }
      return result;
    }
    var _boundaryCheckingState = true;
    function enableBoundaryChecking(flag) {
      if (flag === void 0) {
        flag = true;
      }
      _boundaryCheckingState = flag;
    }
    var index = {
      strip,
      plus,
      minus,
      times,
      divide,
      round,
      digitLength,
      float2Fixed,
      enableBoundaryChecking
    };
    exports.strip = strip;
    exports.plus = plus;
    exports.minus = minus;
    exports.times = times;
    exports.divide = divide;
    exports.round = round;
    exports.digitLength = digitLength;
    exports.float2Fixed = float2Fixed;
    exports.enableBoundaryChecking = enableBoundaryChecking;
    exports["default"] = index;
  }
});

// src/mc.modular-matrix~.js
import Max from "max-api";

// src/mixing.js
var eye = (n) => [...Array(n)].map((e, i, a) => a.map((e2) => +!i--));
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
  if (inputStructure === void 0) {
    console.log(`${inputName} is not an entry in matrix`);
    return;
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
      for (let i = 0; i < numOfDup; i++) {
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
        for (let i = 0; i < numOfDup; i++) {
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
import { hrtime } from "node:process";
var start = hrtime.bigint();

// node_modules/@ircam/sc-utils/src/atodb.js
function atodb(val) {
  return 8.685889638065035 * Math.log(val);
}

// node_modules/@ircam/sc-utils/src/dbtoa.js
function dbtoa(val) {
  return Math.exp(0.11512925464970229 * val);
}

// node_modules/@ircam/sc-utils/src/linear-scale.js
function linearScale(inputStart, inputEnd, outputStart, outputEnd, clip = false) {
  const a = (outputEnd - outputStart) / (inputEnd - inputStart);
  const b = outputStart - a * inputStart;
  if (!clip) {
    return (x) => a * x + b;
  } else {
    const upperBound = Math.max(outputStart, outputEnd);
    const lowerBound = Math.min(outputStart, outputEnd);
    return (x) => {
      const y = a * x + b;
      return Math.max(lowerBound, Math.min(upperBound, y));
    };
  }
}

// node_modules/@ircam/sc-utils/src/counter.js
var import_number_precision = __toESM(require_build(), 1);

// src/mc.modular-matrix~.js
var globals = {
  verbose: false,
  ready: false,
  maxId: null,
  ramp: null,
  boxes: null,
  structure: null,
  file: null,
  userMatrix: { inputs: [], outputs: [], initwith: "", connections: [] },
  // routingMatrix: { inputs: [], outputs: [], initwith: "", crosspatch: { inputs: "", outputs: ""}, connections: []},
  timeoutMap: []
};
Max.addHandlers({
  [Max.MESSAGE_TYPES.BANG]: () => {
  },
  [Max.MESSAGE_TYPES.LIST]: (row, col, gain, time) => onList(row, col, gain, time),
  [Max.MESSAGE_TYPES.NUMBER]: (num) => {
  },
  [Max.MESSAGE_TYPES.DICT]: (dict) => onDict(dict),
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
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args)
});
var handledMessages = ["debug", "maxId", "ramp", "done", "generate", "structure", "routing", "clear", "list", "patch", "dumpconnections", "dumppatch", "dict", "file", "open", "set"];
async function bootstrap() {
  try {
  } catch (err) {
    console.log(err);
  }
  globals.ready = true;
  globals.boxes = await Max.getDict(`${globals.maxId}_modular-matrix-boxes`);
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
  globals.timeoutMap.forEach((timeout) => {
    clearInterval(timeout.function);
  });
  Max.outlet("tomatrixctl", "/clear");
  setTimeout(() => {
    globals.userMatrix.inputs.forEach((input, inputIndex) => {
      globals.userMatrix.outputs.forEach((output, outputIndex) => {
        Max.outlet("tomatrix", inputIndex, outputIndex, 0, 20);
      });
    });
    globals.userMatrix.connections = [];
  }, 50);
}
function onDict(dict) {
  if (dict.numins !== globals.userMatrix.inputs.length || dict.numouts !== globals.userMatrix.outputs.length) {
    Max.post("Be careful, you're trying to recall a preset with a different matrix size");
  }
  if (!dict.patch) {
    Max.outlet("tomatrixctl", "/clear");
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }
    dict.connections.forEach((connection) => {
      if (!allowConnectionWithIndex(connection.in, connection.out, globals)) {
        return;
      }
      Max.outlet("tomatrixctl", connection.in, connection.out, connection.gain);
    });
  } else {
    if (dict.ramptime) {
      onRamp(dict.ramptime);
    }
    globals.timeoutMap.forEach((timeout) => {
      clearInterval(timeout.function);
    });
    Max.outlet("tomatrixctl", "/clear");
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
  Max.outlet("dump", maxDict);
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
  Max.outlet("dump", maxDict);
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
    const structure2 = await Max.getDict(globals.file);
    globals.structure = structure2;
  }
  if (globals.ready && globals.structure) {
    generateMatrix();
  }
}
function generateMatrix() {
  deleteExistingBoxes();
  if (globals.structure.inputs) {
    globals.structure.inputs.forEach((e, i) => {
      if (e.inputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
      }
    });
  }
  ;
  if (globals.structure.outputs) {
    globals.structure.outputs.forEach((e, i) => {
      if (e.outputs !== 0) {
        globals.userMatrix.outputs.push(e.name);
      }
    });
  }
  if (globals.structure.objects) {
    globals.structure.objects.forEach((e, i) => {
      if (e.inputs !== 0 && e.outputs !== 0) {
        globals.userMatrix.inputs.push(e.name);
        globals.userMatrix.outputs.push(e.name);
      }
    });
  }
  ;
  globals.userMatrix.inputs.forEach((e, i) => {
    const numch = getNumChannelsFromInputName(e, globals);
    globals.userMatrix.initwith += `/row/${i + 1}/label ${e}(${numch}ch),`;
  });
  globals.userMatrix.outputs.forEach((e, i) => {
    const numch = getNumChannelsFromOutputName(e, globals);
    globals.userMatrix.initwith += `/col/${i + 1}/label ${e}(${numch}ch),`;
  });
  globals.userMatrix.inputs.forEach((inputName, inputIndex) => {
    globals.userMatrix.outputs.forEach((outputName, outputIndex) => {
      if (!allowConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/editable 0,`;
      }
      if (disableConnectionWithName(inputName, outputName, globals)) {
        globals.userMatrix.initwith += `/row/${inputIndex + 1}/col/${outputIndex + 1}/visible 0,`;
      }
    });
  });
  generateBox("user_matrix_routing", "spat5.matrix", ["@inputs", globals.userMatrix.inputs.length, "@outputs", globals.userMatrix.outputs.length, "@initwith", `"${globals.userMatrix.initwith}"`], { x: 400, y: 260 }, 0);
  generateBox("matrix", "mc.matrix~", [globals.userMatrix.inputs.length, globals.userMatrix.outputs.length, "1.", `@ramp ${globals.ramp}`], { x: 40, y: 190 }, 0);
  generateBox("dict", "dict", [globals.file], { x: 20, y: 3 }, 0);
  generateLink("user_matrix_routing", 0, "user_matrix_out", 0);
  generateLink("routing_matrix_in", 0, "matrix", 0);
  generateLink("user_matrix_in", 0, "user_matrix_routing", 0);
  generateLink("route_mtrx", 2, "dict", 0);
  globals.userMatrix.inputs.forEach((name, index) => {
    const numch = getNumChannelsFromInputName(name, globals);
    generateBox(`recv-${name}`, "mc.receive~", [`${name}-in`, numch], { x: 40 + index * 120, y: 150 }, 0);
    generateLink(`recv-${name}`, 0, "matrix", index);
  });
  globals.userMatrix.outputs.forEach((name, index) => {
    const numch = getNumChannelsFromOutputName(name, globals);
    generateBox(`send-${name}`, "mc.send~", [`${name}-out`, numch], { x: 40 + index * 120, y: 230 }, 0);
    generateLink("matrix", index, `send-${name}`, 0);
  });
  Max.outlet("visualize", "set", `no connections...`);
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
  const userMatrixIndexInput = [];
  const userMatrixIndexOutput = [];
  for (let i = 1; i <= userMatrixInputNumber; i++) {
    const index = globals.userMatrix.inputs.findIndex((e) => e === `${userMatrixInput}`);
    userMatrixIndexInput.push(index);
  }
  for (let i = 1; i <= userMatrixOutputNumber; i++) {
    const index = globals.userMatrix.outputs.findIndex((e) => e === `${userMatrixOutput}`);
    userMatrixIndexOutput.push(index);
  }
  userMatrixIndexInput.forEach((inputNumber, inputIndex) => {
    userMatrixIndexOutput.forEach((outputNumber, outputIndex) => {
      if (mixingLaw.length !== 0) {
        const routingGain = gain * mixingLaw[outputIndex][inputIndex];
        Max.outlet("tomatrix", inputNumber, outputNumber, routingGain);
        setUserMatrixConnection(inputNumber, outputNumber, routingGain);
      }
    });
  });
  let visualize = ``;
  globals.userMatrix.connections.forEach((connection2) => {
    visualize += `${connection2.inputName} > ${connection2.outputName} : ${Math.round(atodb(connection2.gain))}dB
`;
  });
  Max.outlet("visualize", "set", visualize);
}
function setUserMatrixConnection(inputNumber, outputNumber, gain) {
  const inputName = globals.userMatrix.inputs[inputNumber];
  const outputName = globals.userMatrix.outputs[outputNumber];
  const connectionIndex = globals.userMatrix.connections.findIndex((e) => e.inputName === inputName && e.outputName === outputName);
  if (gain !== 0) {
    if (connectionIndex !== -1) {
      globals.userMatrix.connections[connectionIndex].gain = gain;
    } else {
      globals.userMatrix.connections.push({
        inputName,
        outputName,
        gain
      });
    }
  } else {
    globals.userMatrix.connections = globals.userMatrix.connections.filter((v, index) => {
      return index !== connectionIndex;
    });
  }
}
function onMessage(...args) {
  const cmd = args[0];
  if (handledMessages.includes(cmd)) {
    return;
  } else if (args[0].split("")[0] === "/") {
    Max.outlet("tomatrixctl", ...args);
  } else {
    console.log(...args);
  }
}
function onDebug(verbose) {
  globals.verbose = !!verbose;
  Max.outlet("debug", globals.verbose);
}
function generateBox(varName, boxName, args, position, presentation, presentationPosition = { x: 0, y: 0 }, comment) {
  globals.boxes.list.push(varName);
  const textArgs = `${boxName} ${args.join(" ")}`;
  Max.outlet("thispatcher", "script", "newobject", "newobj", "@text", textArgs, "@varname", varName, "@patching_position", position.x, position.y, "@presentation_position", presentationPosition.x, presentationPosition.y, "@presentation", presentation, "@comment", comment);
  Max.setDict(`${globals.maxId}_modular-matrix-boxes`, globals.boxes);
}
function deleteBox(varName) {
  Max.outlet("thispatcher", "script", "delete", varName);
}
function generateLink(varNameOut, outlet, varNameIn, inlet) {
  Max.outlet("thispatcher", "script", "connect", varNameOut, outlet, varNameIn, inlet);
}
Max.outletBang();
Max.outlet("visualize", "set", `matrix~ is not generated`);
