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
let presetsFolder = null;
let cwd = null;
let boxesDictName = null;
let interpolationTime = 0;

let gains = [];
let writeFilename = null;

// generate matrix is called before
Max.addHandler('init', (name, patchPath, patchIndex, interp) => {
  if (patchPath === '') {
    cwd = process.cwd();
  } else {
    const parts = patchPath.split('/');
    const cleaned = parts.slice(3);
    cleaned.pop();
    cwd = `/${cleaned.join('/')}`;
  }

  presetsFolder = path.join(cwd, `matrix-presets`);
  fs.ensureDirSync(presetsFolder);

  boxesDictName = `${patchIndex}_existing_boxes`;

  interpolationTime = interp;

  if (name) {
    generateMatrix(name);
  }
});

Max.addHandler('ready', (n) => {
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
  // Max.outlet(`spatmatrix presentation_rect ${initLeftOffset} ${initTopOffset} ${endLeft} ${endTop}`);
  Max.outlet(`window 435 203 ${435+initLeftOffset+endLeft} ${203+initTopOffset+endTop}`);

  // Max.outlet('thispatcher write');
});

Max.addHandler('generate_matrix', name => generateMatrix(name));

function generateMatrix(name) {
  if (name === 0) {
    console.log('No config file specified, abort...');
    process.exit();
  }

  // read config file
  matrixFilename = path.join(cwd, name);

  if (fs.existsSync(matrixFilename)) {
    generateMatrixPatch(matrix);

    fs.watchFile(matrixFilename, () => {
      generateMatrixPatch(matrix);
    });
  } else {
    console.log(`no config file found, please create "${matrixFilename}" file and relaunch`);
    process.exit();
  }
}

function generateBox(varName, boxName, args, position, presentation, comment) {
  existingBoxes.list.push(varName);

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation ${presentation} @comment ${comment}`;
  Max.outlet(msg);
}

function generateNamedBox(varName, boxName, args, position, presentation, comment) {
  existingBoxes.list.push(varName);

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
      msg = `/row/${index + 1}/label ${name}`;
      break;
    case 'output':
      msg = `/col/${index + 1}/label ${name}`;
      break;
  }

  msg = `spatmatrix ${msg}`;
  Max.outlet(msg);
}

function computeMatrixSize(inputs, outputs) {

  let largeur = 70 + (outputs*60);
  let hauteur = 70 + (inputs*60);

  if (largeur < 125) {
    largeur = 125
  }

  if (hauteur < 125) {
    hauteur = 125
  }

  // return [largeur,hauteur]
  return [125, 125]

}

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

async function generateMatrixPatch(name) {
  matrix = JSON5.parse(fs.readFileSync(matrixFilename));
  numInputs = matrix.inputs.length;
  numOutputs = matrix.outputs.length;

  existingBoxes = await Max.getDict(boxesDictName);

  if (!('list' in existingBoxes)) {
    existingBoxes.list = [];
  }

  // delete previous existing boxes
  existingBoxes.list.forEach(name => {
    deleteBox(name);
  });

  existingBoxes.list = [];

  // create the matrix object
  generateBox('matrix', 'matrix~', [numInputs, numOutputs, '1.', `@ramp ${interpolationTime}`], { x: 40, y: 190 }, 0);
  // spat5.matrix @inputs 3 @outputs 3
  // generateBox('matrix_ctl', 'spat5.matrix', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 110 }, 0);
  generateBox('matrix_routing', 'spat5.matrix', ['@inputs', numInputs, '@outputs', numOutputs], { x: 20, y: 60 }, 1);
  generateBox('matrix_ctl_rcv', 'receive', ['#0_spatmatrix'], { x: 20, y: 5 }, 0);
  generateBox('matrix_unpack', 'mc.unpack~', [numInputs], { x: 20, y:30 }, 0);
  generateBox('matrix_pack', 'mc.pack~', [numOutputs], { x: 20, y:280 }, 0);
  // generateBox('send-dump', 'send', ['spatdump'], { x: 200, y: 235}, 0);
  // generateBox('tonode', 'send', ['_node'], { x: 40, y: 300}, 0);
  // connect both
  // generateLink('matrix_ctl', 0, 'matrix', 0);
  generateLink('matrix_routing', 0, 'matrix', 0);
  generateLink('matrix_ctl_rcv', 0, 'matrix_routing', 0);
  generateLink('matrix_routing', 1, 'send-dump', 0);
  generateLink('matrix_pack', 0, 'mc-outlet', 0);


  // generate receive boxes
  matrix.inputs.forEach((name, index) => {
    generateBox(`recv-${name}`, 'receive~', [name], { x: (40 + index * 120), y: 150 }, 0);
    generateLink(`recv-${name}`, 0, 'matrix', index);
    generateLink('matrix_unpack', index, 'matrix', index);
    // generateNamedBox(`inlet-${index}`, 'inlet', [], { x: (60 + index * 120), y: 300}, 0, `${name}`);

    if (index === 0) {
      generateLink('route_mtrx', 7, 'matrix_unpack', 0);
    }
  });

  matrix.outputs.forEach((name, index) => {
    generateBox(`send-${name}`, 'send~', [name], { x: (40 + index * 120), y: 230 }, 0);
    generateLink('matrix', index, `send-${name}`, 0);
    generateLink('matrix', index, 'matrix_pack', index);
  });

  await Max.setDict(boxesDictName, existingBoxes);

  setTimeout(() => Max.outlet('ready bang'), 2000);
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

    Max.outlet('update_preset_list bang');
  }
});

Max.addHandler('load', (filename) => {
  if (matrixFilename === null) {
    console.log("No configuration file specified, abord.");
    process.exit()
  }

  const loadFilename = path.join(presetsFolder, `${filename}`);

  if (!fs.existsSync(loadFilename)) {
    console.log(`preset ${filename} do not exist`);
    return;
  }
  const data = fs.readFileSync(loadFilename);


  // clear matrix
  Max.outlet('spatmatrix /clear');

  const lines = data.toString().split('\n');
  if (lines.length > (numInputs*numOutputs) ) {
    console.log('preset size do not match matrix size, please be careful');
  }

  lines.forEach((line) => {
    const [inName, outName, value] = line.split(' ');
    inputIndex = matrix.inputs.indexOf(inName) + 1;
    outputIndex = matrix.outputs.indexOf(outName) + 1;

    if (inputIndex == 0) {
      return;
    }
    if (outputIndex == 0) {
      return;
    }

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
  msg = `/row/${row + 1}/col/${col + 1} ${gain}`;

  out = `spatmatrix ${msg}`;
  Max.outlet(out);
});

Max.addHandler('clear', () => {
  msg = `spatmatrix /clear`;
  Max.outlet(msg);
})

Max.outlet('bootstraped');
Max.outlet('update_preset_list bang');

