const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');

// read config
const matrixFilename = path.join(process.cwd(), 'matrix.json');
let matrixStr = fs.readFileSync(matrixFilename);
let matrix = JSON5.parse(matrixStr);
let numInputs = matrix.inputs.length;
let numOutputs = matrix.outputs.length;

const presetsFolder = path.join(process.cwd(), `matrix-presets`);
fs.ensureDirSync(presetsFolder);

const existingBoxesFilename = path.join(process.cwd(), `.existing-boxes`);
let existingBoxes = [];

if (fs.existsSync(existingBoxesFilename)) {
  existingBoxes = fs.readFileSync(existingBoxesFilename).toString().split(' ');
}

let gains = [];
let writeFilename = null;

function generateBox(varName, boxName, args, position) {
  existingBoxes.push(varName);
  fs.writeFileSync(existingBoxesFilename, existingBoxes.join(' '));

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y}`;
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

function generateMatrixLabel(type, name, index) {
  let msg = '';

  switch(type) {
    case 'input':
      msg = `/row/${index + 1}/name ${name}`;
      break;
    case 'output':
      msg = `/col/${index + 1}/name ${name}`;
      break;
  }

  msg = `spatmatrix ${msg}`;
  Max.outlet(msg);
}

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// // Use the 'addHandler' function to register a function for a particular message
Max.addHandler("generate_matrix", () => {
  // delete previous existing boxes
  existingBoxes.forEach(name => {
    deleteBox(name);
  });

  existingBoxes = [];

  // override config
  matrixStr = fs.readFileSync(path.join(process.cwd(), 'matrix.json'));
  matrix = JSON5.parse(matrixStr);
  numInputs = matrix.inputs.length;
  numOutputs = matrix.outputs.length;

  // create the matrix object
  generateBox('matrix', 'matrix~', [numInputs, numOutputs], { x: 40, y: 340 });
  // spat5.matrix @inputs 3 @outputs 3
  generateBox('matrix_ctl', 'spat5.matrix', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 260 });
  generateBox('matrix_routing', 'spat5.routing', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 210 });
  generateBox('matrix_ctl_rcv', 'receive', ['spatmatrix'], { x: 20, y: 180 });
  generateBox('send-dump', 'send', ['spatdump'], { x: 200, y: 235});
  // connect both
  generateLink('matrix_ctl', 0, 'matrix', 0);
  generateLink('matrix_routing', 0, 'matrix_ctl', 0);
  generateLink('matrix_ctl_rcv', 0, 'matrix_routing', 0);
  generateLink('matrix_routing', 1, 'send-dump', 0);

  // generate receive boxes
  matrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, 'receive~', [name], { x: (40 + index * 120), y: 300 });
    generateLink(`recv-${name}`, 0, 'matrix', index);
  });

  matrix.outputs.forEach((name, index) => {
    generateBox(`send-${name}`, 'send~', [name], { x: (40 + index * 120), y: 380 });
    generateLink('matrix', index, `send-${name}`, 0);
  });

  setTimeout(() => {
    // generate receive boxes
    matrix.inputs.forEach((name, index) => {
      generateMatrixLabel('input', name, index);
    });

    matrix.outputs.forEach((name, index) => {
      generateMatrixLabel('output', name, index);
    });

    Max.outlet('thispatcher write');

  }, 100);


});

Max.addHandler("write", (filename) => {
  writeFilename = filename;
  // read config
  gains = [];

  const msg = `spatmatrix /dump`;
  Max.outlet(msg);
});

Max.addHandler('gains', (value) => {
  gains.push(value);

  const lines = [];

  if (gains.length === numInputs * numOutputs) {
    matrix.inputs.forEach((inputName, inputIndex) => {
      matrix.outputs.forEach((outputName, outputIndex) => {
        const index = inputIndex * matrix.outputs.length + outputIndex;
        const gain = gains[index];

        const line = `${inputName} ${outputName} ${gain}`
        lines.push(line);
      });
    });

    const lineText = lines.join('\n');
    const filename = path.join(presetsFolder, `${writeFilename}`);

    fs.writeFileSync(filename, lineText);
    writeFilename = null;
  }
});

Max.addHandler('load', (filename) => {
  const loadFilename = path.join(presetsFolder, `${filename}`);
  const data = fs.readFileSync(loadFilename);

  // clear matrix
  Max.outlet('spatmatrix /clear');

  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    const [inName, outName, value] = line.split(' ');
    inputIndex = matrix.inputs.indexOf(inName) + 1;
    outputIndex = matrix.outputs.indexOf(outName) + 1;

    const msg = `/row/${inputIndex}/col/${outputIndex} ${value}`;
    Max.outlet(`spatmatrix ${msg}`);
  });
});

Max.addHandler('edit_matrix', (filename) => {
  open(matrixFilename);
});
