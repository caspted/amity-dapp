import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProjectFactoryModule", (m) => {
  const projectFactory = m.contract("ProjectFactory");

  return { projectFactory };
});
