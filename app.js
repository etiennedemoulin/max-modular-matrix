const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const md5 = require('md5');

let matrixFilename = null;
let matrixStr = null;
let matrix = null;
let numInputs = null;
let numOutputs = null;


const presetsFolder = path.join(process.cwd(), `matrix-presets`);
fs.ensureDirSync(presetsFolder);

const existingBoxesFilename = path.join(process.cwd(), `.existing-boxes`);
let existingBoxes = [];

const matrixChecksumFilename = path.join(process.cwd(), `.matrix-checksum`);
let matrixChecksum = '';

if (fs.existsSync(existingBoxesFilename)) {
  existingBoxes = fs.readFileSync(existingBoxesFilename).toString().split(' ');
}

if (fs.existsSync(matrixChecksumFilename)) {
  matrixChecksum = fs.readFileSync(matrixChecksumFilename).toString();
}

let gains = [];
let writeFilename = null;

//watch for save
function watchConfigFile(path) {
  let md5Previous = null;
  let fsWait = false;
  fs.watch(path, (event, filename) => {
  if (filename) {
    if (fsWait) return;
    fsWait = setTimeout(() => {
      fsWait = false;
    }, 100);
    const md5Current = md5(fs.readFileSync(path));
    if (md5Current === md5Previous) {
      return;
    }
    md5Previous = md5Current;
    matrixStr = fs.readFileSync(path);
    matrix = JSON5.parse(matrixStr);
    numInputs = matrix.inputs.length;
    numOutputs = matrix.outputs.length;
    console.log(`${filename} update`);
    if (matrixChecksum !== md5Current) {
      matrixChecksum = md5Current;
      fs.writeFileSync(matrixChecksumFilename, matrixChecksum);
      generate_matrix(matrix);
    }
  }
});
}


function generateBox(varName, boxName, args, position, presentation, comment) {
  existingBoxes.push(varName);
  fs.writeFileSync(existingBoxesFilename, existingBoxes.join(' '));

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation ${presentation} @comment ${comment}`;
  Max.outlet(msg);
}

function generateNamedBox(varName, boxName, args, position, presentation, comment) {
  existingBoxes.push(varName);
  fs.writeFileSync(existingBoxesFilename, existingBoxes.join(' '));

  const msg = `thispatcher script newobject ${boxName} @varname ${varName} @patching_position ${position.x} ${position.y} @presentation ${presentation} @comment ${comment}`;
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

function computeMatrixSize(inputs, outputs) {

  let largeur = 70 + (inputs*30);
  let hauteur = 20 + (outputs*25);

  if (largeur < 125) {
    largeur = 125
  }

  if (hauteur < 125) {
    hauteur = 125
  }

  return [largeur,hauteur]

}

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// // Use the 'addHandler' function to register a function for a particular message
Max.addHandler("generate_matrix", (name) => {

  if (name === 0) {
    console.log("No configuration file specified, abord.");
    process.exit()
  }

  //Read config file
  matrixFilename = path.join(process.cwd(), name);
  if (fs.existsSync(matrixFilename) === true) {
    // override config
    matrixStr = fs.readFileSync(matrixFilename);
    matrix = JSON5.parse(matrixStr);
    numInputs = matrix.inputs.length;
    numOutputs = matrix.outputs.length;
    watchConfigFile(path.join(process.cwd(), name));
  }
  else {
    console.log("wrong config file specified. abord.")
    process.exit()
  }

  if (matrixChecksum !== md5(fs.readFileSync(matrixFilename)) ) {
    matrixChecksum = md5(fs.readFileSync(matrixFilename));
    fs.writeFileSync(matrixChecksumFilename, matrixChecksum);
    generate_matrix(matrix);
  }


});

function generate_matrix(name) {
  console.log('generate_matrix');

  // delete previous existing boxes
  existingBoxes.forEach(name => {
    deleteBox(name);
  });

  existingBoxes = [];

  // create the matrix object
  generateBox('matrix', 'matrix~', [numInputs, numOutputs], { x: 40, y: 340 }, 0);
  // spat5.matrix @inputs 3 @outputs 3
  generateBox('matrix_ctl', 'spat5.matrix', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 260 }, 0);
  generateBox('matrix_routing', 'spat5.routing.embedded', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 210 }, 1);
  generateBox('matrix_ctl_rcv', 'receive', ['_spatmatrix'], { x: 20, y: 180 }, 0);
  // generateBox('send-dump', 'send', ['spatdump'], { x: 200, y: 235}, 0);
  // generateBox('tonode', 'send', ['_node'], { x: 40, y: 300}, 0);
  // connect both
  generateLink('matrix_ctl', 0, 'matrix', 0);
  generateLink('matrix_routing', 0, 'matrix_ctl', 0);
  generateLink('matrix_ctl_rcv', 0, 'matrix_routing', 0);
  generateLink('matrix_routing', 1, 'send-dump', 0);

  // generate receive boxes
  matrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, 'receive~', [name], { x: (40 + index * 120), y: 300 }, 0);
    generateLink(`recv-${name}`, 0, 'matrix', index);
    generateNamedBox(`inlet-${index}`, 'inlet', [], { x: (60 + index * 120), y: 300}, 0, `${name}`);
    if (index === 0) {
      generateLink('inlet-0', 0, 'route_mtrx', 0);
      generateLink('route_mtrx', 4, 'matrix', 0);
    }
    else {
      generateLink(`inlet-${index}`, 0, 'matrix', index);
    }
  });

  matrix.outputs.forEach((name, index) => {
    generateBox(`send-${name}`, 'send~', [name], { x: (40 + index * 120), y: 380 }, 0);
    generateLink('matrix', index, `send-${name}`, 0);
    generateNamedBox(`outlet-${index}`, 'outlet', [], { x: (60 + index * 120), y: 380}, 0, `${name}`);
    generateLink('matrix', index, `outlet-${index}`, 0);
  });

  generateLink('inlet-0', 0, 'tonode', 0);

};

Max.addHandler("write", (filename) => {
  if (matrixFilename === null) {
    console.log("No configuration file specified, abord.");
    process.exit()
  };

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
  if (matrixFilename === null) {
    console.log("No configuration file specified, abord.");
    process.exit()
  }
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
  if (matrixFilename === null) {
    console.log("No configuration file specified, abord.");
    process.exit()
  }
  open(matrixFilename);
});

Max.addHandler('list', (row, col, gain) => {
  // console.log("col ", col, ' row ', row, ' gain ', gain);
  msg = `/row/${row + 1}/col/${col + 1} ${gain}`;

  out = `spatmatrix ${msg}`;
  Max.outlet(out);
});

Max.addHandler('clear', () => {
  msg = `spatmatrix /clear`;
  Max.outlet(msg);
})

Max.addHandler('ready', () => {
  // generate receive boxes
  matrix.inputs.forEach((name, index) => {
    generateMatrixLabel('input', name, index);
  });

  matrix.outputs.forEach((name, index) => {
    generateMatrixLabel('output', name, index);
  });

  const matrixSize = computeMatrixSize(numInputs, numOutputs);
  const initLeftOffset = 125;
  const initTopOffset = 0;
  const endLeft = matrixSize[0];
  const endTop = matrixSize[1];
  Max.outlet(`spatmatrix presentation_rect ${initLeftOffset} ${initTopOffset} ${endLeft} ${endTop}`);
  Max.outlet(`window 435 203 ${435+initLeftOffset+endLeft} ${203+initTopOffset+endTop}`);

  Max.outlet('thispatcher write');
})

Max.outlet('bootstraped');
