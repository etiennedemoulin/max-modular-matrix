# max-modular-matrix


## Indroduction
modular.matrix~ is an array of signal connectors and mixers (adders). It can have any number of inlets and outlets. Signals entering at each inlet can be routed to one or more of the outlets, with a variable amount of gain. If an outlet is connected to more than one inlet, its output signal is the sum of the signals from the inlets.  
modular.matrix~ is a mc object : all of its signal inlets are combined into a single multichannel inlet and all of its signal outlets are combined into a single multichannel outlet. The behavior of modular.matrix~ is otherwise identical to matrix~.  
The only difference between matrix~ and modular.matrix~ is the way of accessing datas. modular.matrix~ access datas by name instead of index, this permit to modify the matrix without breaking connections.

## Installation
Download modular-matrix.zip from [release](https://github.com/etiennedemoulin/max-modular-matrix/releases)  
Unzip the package and copy the resulting directory in `~/Documents/Max 8/Library`  
Run `xattr -d -r com.apple.quarantine "~/Documents/Max 8/Library/modular-matrix"`   


## Usage
Connections the the matrix can be made with inlets and outlets or with send~ and receive~  
Please see modular.matrix.maxhelp for more infos  
