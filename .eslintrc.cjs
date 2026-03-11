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
                  "domains/*/*",
                  "**/domains/*/*",
                  "@*/shared-*/*",
                  "shared-*/*"
                ],
                "message": "Deep imports across shared package/domain boundaries are forbidden. Re-export from the public root entrypoint and import from that root."
              }
            ]
          }
        ]
      }
    }
  ]
};
