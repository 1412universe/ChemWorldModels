#!/bin/bash
#SBATCH -p v6_384
#SBATCH -N 1
#SBATCH -n 32
#SBATCH --job-name=OCM
#SBATCH --output=vasp_%j.log

source /public1/soft/modules/module.sh
module load mpi/oneAPI/2022.1
export LD_LIBRARY_PATH=/public1/soft/intel/2018/compilers_and_libraries_2018.2.199/linux/mkl/lib/intel64_lin:$LD_LIBRARY_PATH

VASP=/public1/home/t6s000306/software-t6s000306/544-vtst+opt+sol+wannier/vasp_std
mpirun -np 32 $VASP
