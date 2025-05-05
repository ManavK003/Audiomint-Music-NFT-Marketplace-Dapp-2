// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MusicNFT is ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 public tokenCounter;

    constructor() ERC721("AudiomintMusic", "AUDIO") Ownable(msg.sender) {
        tokenCounter = 0;
    }

    function mintMusicNFT(string memory uri) public returns (uint256) {
        uint256 newId = tokenCounter;
        _safeMint(msg.sender, newId);
        _setTokenURI(newId, uri);
        tokenCounter++;
        return newId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    
}
