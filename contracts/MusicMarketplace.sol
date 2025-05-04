// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IYodaCoin {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MusicMarketplace is Ownable {
    struct Listing {
        address seller;
        uint256 price;
    }

    IYodaCoin public yoda;
    IERC721 public musicNFT;
    mapping(uint256 => Listing) public listings;

    constructor(address _yoda, address _nft) Ownable(msg.sender) {
        yoda = IYodaCoin(_yoda);
        musicNFT = IERC721(_nft);
    }

    function listNFT(uint256 tokenId, uint256 price) public {
        require(musicNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");

        // Transfer the NFT to marketplace contract (escrow)
        musicNFT.transferFrom(msg.sender, address(this), tokenId);
        listings[tokenId] = Listing(msg.sender, price);
    }

    function buyNFT(uint256 tokenId) public {
        Listing memory item = listings[tokenId];
        require(item.price > 0, "Not for sale");

        // Pay the seller
        yoda.transferFrom(msg.sender, item.seller, item.price);

        // Transfer NFT from marketplace to buyer
        musicNFT.transferFrom(address(this), msg.sender, tokenId);

        delete listings[tokenId];
    }
}
