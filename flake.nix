{
  description = "Discord bot with Bun and Vercel AI SDK";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_22
            git
          ];
          
          shellHook = ''
            echo "🦉🦉🦉🦉🦉🦉🦉🦉🦉🦉🦉"
          '';
        };

        packages.default = pkgs.writeScriptBin "start-bot" ''
          #!/bin/sh
          bun run packages/bot/src/index.ts
        '';
      });
}
