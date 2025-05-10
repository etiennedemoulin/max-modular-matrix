const eye = n => [...Array(n)].map((e, i, a) => a.map(e => +!i--));

export function disableConnectionWithName(inputName, outputName, globals) {
  if (inputName === outputName) {
    return true
  } else {
    return false
  }
}

export function getNumChannelsFromInputName(inputName, globals) {

  let inputStructure = globals.structure.inputs.find(e => e.name === inputName);
  if (inputStructure === undefined) {
    inputStructure = globals.structure.objects.find(e => e.name === inputName);
  }


  if (inputStructure === undefined) {
    // structure do not exist
    console.log(`${inputName} is not an entry in matrix`);
    return;
  }

  const inputNumber = inputStructure.inputs;

  return inputNumber;
}

export function getNumChannelsFromOutputName(outputName, globals) {

  let outputStructure = globals.structure.outputs.find(e => e.name === outputName);
  if (outputStructure === undefined) {
    outputStructure = globals.structure.objects.find(e => e.name === outputName);
  }
  if (outputStructure === undefined) {
    return null;
  }
  const outputNumber = outputStructure.outputs;

  return outputNumber;
}

export function getIndexesFromNames(inputName, outputName, globals) {
  const inputIndex = globals.userMatrix.inputs.findIndex(e => e === inputName);
  const outputIndex = globals.userMatrix.outputs.findIndex(e => e === outputName);
  return { inputIndex, outputIndex };
}


export function allowConnectionWithName(inputName, outputName, globals) {
  const inputNumber = getNumChannelsFromInputName(inputName, globals);
  const outputNumber = getNumChannelsFromOutputName(outputName, globals);

  if (inputName === outputName) {
    return false;
  }

  if (getMixingLaw(inputNumber, outputNumber) === null) {
    return false;
  } else {
    return true;
  }
}

export function allowConnectionWithIndex(inputIndex, outputIndex, globals) {
  const inputName = globals.userMatrix.inputs[inputIndex];
  const outputName = globals.userMatrix.outputs[outputIndex];

  return allowConnectionWithName(inputName, outputName, globals);

}

export function getMixingLaw(inputNumber, outputNumber) {

  if (inputNumber < outputNumber) {
    // upmixing
    // remove 3dB for each more output (not sure)
    // const attenuation = ((outputNumber / inputNumber) - 1) * -3;
    if (Number.isInteger(outputNumber / inputNumber)) {
      // can upmix easily
      const outputArray = [];
      const numOfDup = outputNumber / inputNumber;
      const unitMatrix = eye(inputNumber)
      for (let i = 0; i < numOfDup; i++) {
        unitMatrix.forEach(e => {
          outputArray.push(e);
        })
      }
      return outputArray;
    } else {
      return null;
    }
  } else if (inputNumber > outputNumber) {
    if (Number.isInteger(inputNumber / outputNumber)) {
      // can downmix easily
      const outputArray = [];
      const numOfDup = inputNumber / outputNumber;
      const unitMatrix = eye(outputNumber);
      unitMatrix.forEach(line => {
        // [0, 1]
        const intermediateArray = [];
        for (let i = 0; i < numOfDup; i++) {
          line.forEach(e => {
            intermediateArray.push(e)
          })
        }
        outputArray.push(intermediateArray);
      })
      return outputArray;
    } else {
      return null;
    }
  } else {
    return eye(inputNumber);
  }
}
