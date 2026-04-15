async function main() {
  const Cert = await ethers.getContractFactory("Cert");
  const cert = await Cert.deploy();

  await cert.waitForDeployment();

  console.log("Contract address:", await cert.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});