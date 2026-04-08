async function main() {
  const AuditConsentRegistry = await ethers.getContractFactory("AuditConsentRegistry");
  const registry = await AuditConsentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AuditConsentRegistry deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
