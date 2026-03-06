module.exports = {
  root: true,
  ignorePatterns: ["**/*"],
  plugins: ["@nx"],
  overrides: [
    {
      files: ["*.ts", "*.tsx", "*.js", "*.jsx", "*.vue"],
      rules: {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "lane:moneyshyft",
                "onlyDependOnLibsWithTags": ["lane:moneyshyft", "scope:shared"]
              },
              {
                "sourceTag": "lane:connectshyft",
                "onlyDependOnLibsWithTags": ["lane:connectshyft", "scope:shared"]
              },
              {
                "sourceTag": "lane:signshyft",
                "onlyDependOnLibsWithTags": ["lane:signshyft", "scope:shared"]
              },
              {
                "sourceTag": "scope:shared",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              }
            ]
          }
        ],
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": [
                  "packages/shared-*/src/*",
                  "**/packages/shared-*/src/*",
                  "@*/shared-*/*",
                  "shared-*/*"
                ],
                "message": "Deep imports across shared package boundaries are forbidden. Re-export from src/index.ts and import from the package root."
              }
            ]
          }
        ]
      }
    }
  ]
};
