import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSpinMachine = await deploy("SpinMachine", {
    from: deployer,
    log: true,
  });

  console.log(`SpinMachine contract deployed at: ${deployedSpinMachine.address}`);
};
export default func;
func.id = "deploy_spinMachine"; // id required to prevent reexecution
func.tags = ["SpinMachine"];

