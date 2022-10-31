# max-modular-matrix


## Indroduction
Max matrix object with control and preset integrated  
Inlets and outlets are created with the attached json file  
preset will remain if matrix is modified  

## Installation
Clone the repository  
See `modular.matrix.maxhelp` as a first look  

## Use in your own project
**Always start patching from a copy of this repository**  
Copy the entire max-modular-matrix directory into your desired Max working directory   
eg: copy from `~/Download/max-modular-matrix` to `~/Desktop/max-modular-matrix` and rename this folder into `~/Desktop/myProject`  
Create a `myConcert.json` into this directory. See `matrix.json` attached for a sample configuration  
Instanciate the object in your main patcher  `modular.matrix myConcert.json`  

## Usage
Connections the the matrix can be made with inlets and outlets or with send~ and receive~  
`write myConcertPreset.txt` will write a preset file with the current matrix connections  
`load myConcertPreset.txt` will load the preset  
Please see modular.matrix.maxhelp for more infos  

## Known issues
- Use only one object per working directory
- Do not duplicate the object
- work only with 1 object PER FOLDER!
  + 2 problems :
    * patch is saved with boxes created inside
    * attached file with the patch to make it work
- debug broken

