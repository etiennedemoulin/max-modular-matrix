# max-modular-matrix


## Indroduction
modular.matrix~ is an array of signal connectors and mixers (adders). It can have any number of inlets and outlets. Signals entering at each inlet can be routed to one or more of the outlets, with a variable amount of gain. If an outlet is connected to more than one inlet, its output signal is the sum of the signals from the inlets.  
modular.matrix~ is a mc object : all of its signal inlets are combined into a single multichannel inlet and all of its signal outlets are combined into a single multichannel outlet.  

## Installation
Download modular-matrix.zip from [release](https://github.com/etiennedemoulin/max-modular-matrix/releases)  
Unzip the package and copy the resulting directory in `~/Documents/Max 8/Library`  
Run `cd ~/Documents/Max\ 8/Library/modular-matrix && xattr -d -r com.apple.quarantine .`   
**Important** The graphical component of modular.matrix~ depend for now on `spat5.matrix` Max object who is a part of `spat5` project available on [IRCAM Forum](https://forum.ircam.fr).

## Development
Clone this repository and `cd max-modular-matrix && npm install && npm run build` to build the script from Max.  
Sources files are located in `src` folder.  

## Usage
Please see modular.matrix.maxhelp for more infos  

## Acknowledgements
The modular-matrix has received support from the Ircam UPI SO(a)P  
