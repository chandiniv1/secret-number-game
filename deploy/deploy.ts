import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSecretNumberGame = await deploy("SecretNumberGame", {
    from: deployer,
    log: true,
  });

  console.log(`SecretNumberGame contract deployed at: `, deployedSecretNumberGame.address);
};

export default func;
func.id = "deploy_secretNumberGame"; // unique id to avoid redeploy
func.tags = ["SecretNumberGame"];
