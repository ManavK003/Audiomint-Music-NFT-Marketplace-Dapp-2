// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MusicNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;

    constructor() ERC721("AudiomintMusic", "AUDIO") Ownable(msg.sender) {
        tokenCounter = 0;
    }

    function mintMusicNFT(string memory tokenURI) public returns (uint256) {
        uint256 newId = tokenCounter;
        _safeMint(msg.sender, newId);
        _setTokenURI(newId, tokenURI);
        tokenCounter++;
        return newId;
    }
}

