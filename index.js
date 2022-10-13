// utiliser routing à la place de matrix

const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
const Max = require('max-api');

let existingBoxes = [];

function generateBox(varName, boxName, args, position) {
  existingBoxes.push(varName);
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
      msg = `/row/${index + 1}/label ${name}`;
      break;
    case 'output':
      msg = `/col/${index + 1}/label ${name}`;
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

  // read config
  const matrixStr = fs.readFileSync(path.join(process.cwd(), 'matrix.json'));
  const matrix = JSON5.parse(matrixStr);

  const numInputs = matrix.inputs.length;
  const numOutputs = matrix.outputs.length;

  // create the matrix object
  generateBox('matrix', 'matrix~', [numInputs, numOutputs], { x: 40, y: 340 });
  // spat5.matrix @inputs 3 @outputs 3
  generateBox('matrix_ctl', 'spat5.matrix', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 260 });
  generateBox('matrix_ctl_rcv', 'receive', ['spatmatrix'], { x: 20, y: 220 });
  // connect both
  generateLink('matrix_ctl', 0, 'matrix', 0);
  generateLink('matrix_ctl_rcv', 0, 'matrix_ctl', 0);

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
  }, 500);
});

Max.addHandler("write", (fileName) => {
  const lines = [];
  msg = `spatmatrix /dump`;
  Max.outlet(msg);

  const gains = dump.split(' ');

  inputs.forEach((inputName, inputIndex) => {
    output.forEach((inputName, outputIndex) => {
      const index = inputIndex * output.length + outputIndex;
      const gain = gains[index];

      const line = `${inputName} ${outputName} ${gain}`
      lines.push(line);
    });
  });

  const lineText = lines.join('\n');

  const filename = path.join(process.cwd(), `${fileName}`);
  fs.writeFileSync(lineText, filename)
})

// // Use the 'outlet' function to send messages out of node.script's outlet
// Max.addHandler("echo", (msg) => {
//   Max.outlet(msg);
// });
