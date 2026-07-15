/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  // Inclui src e tests para que a cobertura reflita o projeto inteiro
  // (arquivos sem teste aparecem como 0%, medindo a % real de todo o codigo)
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  // Transpila TypeScript nos testes usando ts-jest (isolatedModules = mais rapido)
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }],
  },
  // De quais arquivos medir a cobertura (todo o src, menos o bootstrap do servidor)
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
  // Requisito do desafio: no minimo 20% de cobertura. O comando falha se ficar abaixo.
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 20,
      functions: 20,
      lines: 20,
    },
  },
};
