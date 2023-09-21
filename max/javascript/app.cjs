const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const { fork } = require('child_process');
const fs = require('fs-extra');

let configFilename = null;
let cwd = null;
let patchPath = null;
let boxesDictName = null;
let patchIndex = null;

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
  edit: () => { if (configFilename) { open(configFilename) }},
  init: (name, patchPath, patchIndex, receivedPort, receivedController) => init(name, patchPath, patchIndex, receivedPort, receivedController),
  device: (name) => _setMidiDevice(name),
  controller: (name) => _setController(name),
  config: (name) => {
    configFilename = path.join(cwd, name);
    _setConfig(configFilename);
  },
});

// START SOUNDWORKS
const child = fork('./.build/server/index.js');

process.on('exit', function() {
  child.kill('SIGTERM');
});

process.on('error', function() {
  child.kill('SIGTERM');
});

process.on('uncaughtException', function() {
  child.kill('SIGTERM');
});


async function onMessage(...args) {
  // if (globals.state === null) {
  //   return;
  // }
  // console.log(args);

  const [key, value] = args
  const handledMessages = ['edit', 'config', 'device', 'init', 'controller'];

  if (handledMessages.includes(key)) {
    return;
  }

}
function generateBox(varName, boxName, args, position, presentation, presentationPosition = {x:0, y:0}, comment) {
  existingBoxes.list.push(varName);

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation_position ${presentationPosition.x} ${presentationPosition.y} @presentation ${presentation} @comment ${comment}`;
  Max.outlet(msg);
}

function deleteBox(varName) {
  const msg = `thispatcher script delete ${varName}`;
  Max.outlet(msg);
}

function generateLink(varNameOut, outlet, varNameIn, inlet) {
  const msg = `thispatcher script connect ${varNameOut} ${outlet} ${varNameIn} ${inlet}`;
  Max.outlet(msg);
}

// Init when Max is ready
async function init(name, patchPath, pInd, receivedPort, receivedController) {
  // patchIndex (global)
  // patchPath is saved into cwd (globals)
  // name is saved into configFilename (globals)
  patchIndex = pInd;
  if (patchPath === '') {
    cwd = process.cwd();
  } else {
    const parts = patchPath.split('/');
    const cleaned = parts.slice(3);
    cleaned.pop();
    cwd = `/${cleaned.join('/')}`;
  }
  boxesDictName = `${patchIndex}_modular-matrix_existing_boxes`;

  existingBoxes = await Max.getDict(boxesDictName);

  if (!('list' in existingBoxes)) {
    existingBoxes.list = [];
  }

  // delete previous existing boxes
  existingBoxes.list.forEach(name => {
    deleteBox(name);
  });

  existingBoxes.list = [];

  // if (name !== 0) {
  //   configFilename = path.join(cwd, name);
  // }

  // if (receivedPort !== 0) {
  //   port = receivedPort;
  // };

  // if (receivedController !== 0) {
  //   controller = receivedController;
  // }

};

Max.outlet('bootstraped');

function isJsonString(str) {
    try {
        JSON5.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

child.on('message', async function (message) {
  if (isJsonString(message)) {
    const state = JSON5.parse(message);
    await Max.setDict(`${patchIndex}_matrixDict`, state);
    await Max.outlet('update bang');
  }
  if (message === 'error') {
    console.log("> node script will stop");
    process.exit();
  }
});
