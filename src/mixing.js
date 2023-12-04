const eye = n => [...Array(n)].map((e, i, a) => a.map(e => +!i--));


export function allowConnectionWithName(inputName, outputName, globals) {
  const inputNumber = globals.structure.find(e => e.name === inputName).inputs;
  const outputNumber = globals.structure.find(e => e.name === outputName).outputs;
  if (getMixingLaw(inputNumber, outputNumber) === null) {
    return false;
  } else {
    return true;
  }
}

export function allowConnectionWithIndex(inputIndex, outputIndex, globals) {
  const inputName = globals.userMatrix.inputs[inputIndex];
  const outputName = globals.userMatrix.outputs[outputIndex];
  const inputNumber = globals.structure.find(e => e.name === inputName).inputs;
  const outputNumber = globals.structure.find(e => e.name === outputName).outputs;
  if (getMixingLaw(inputNumber, outputNumber) === null) {
    return false;
  } else {
    return true;
  }
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
      for (i = 0; i < numOfDup; i++) {
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
        for (i = 0; i < numOfDup; i++) {
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
