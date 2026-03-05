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
                "sourceTag": "lane:routeshyft",
                "onlyDependOnLibsWithTags": ["lane:routeshyft", "scope:shared"]
              },
              {
                "sourceTag": "lane:connectshyft",
                "onlyDependOnLibsWithTags": ["lane:connectshyft", "scope:shared"]
              },
              {
                "sourceTag": "scope:shared",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              }
            ]
          }
        ]
      }
    }
  ]
};
