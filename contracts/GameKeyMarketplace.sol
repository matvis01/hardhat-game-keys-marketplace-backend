// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

error InsufficientFunds(uint256 available, uint256 required);
error PriceMustBeAboveZero();
error NoListingFound();
error TransferFailed();
error PercetageCantBeAbove100();
error OnlyOwnerCanCancelListing();

contract GameKeyMarketplace {

    struct Game{
        uint256 id;
        string name;
        string image;
        uint256 rating;
        string[] tags;
        string[] genres;
    }
    struct Listings {
        uint256 gameId;
        string[] keys;
        uint256 price;
        address owner;
    }
    struct BoughtGame{
        uint256 gameId;
        string key;
    }

    event ItemListed(uint256 indexed gameId, uint256 indexed price,string gameName, string gameImage, string[] tags, string[] genres,uint256 rating, address indexed seller);
    event ItemBought(uint256 indexed gameId, uint256 indexed price, address indexed buyer);
    event ItemCancelled(string indexed gameId);

    mapping(string => Listings) private listings;
    mapping(address => BoughtGame[]) private gamesBought;
    mapping(address => uint256) private balances;

    address private owner;
    uint256 private sellersPercentage;

    constructor() {
        balances[msg.sender] = 0;
        owner = msg.sender;
        sellersPercentage = 99;
    }

    function listGameKey(Game memory game, string memory listingId, string memory key, uint256 price) external {
          require(price > 0, "Price must be above zero");
          
        string[] memory currentKeys = listings[listingId].keys;
        listings[listingId] = Listings(game.id,currentKeys, price, msg.sender);
        listings[listingId].keys.push(key);

        emit ItemListed(game.id,price,game.name,game.image,game.tags, game.genres,game.rating, msg.sender);
    }

    function buyGameKey(string memory listingId, uint256 gameId, address seller, uint256 price) external payable{
        Listings memory listing = listings[listingId];
        if(listing.keys.length == 0) {
            revert NoListingFound();
        }
        if (price > msg.value) {
            revert InsufficientFunds(msg.value, price);
        }
        string memory key = listing.keys[listing.keys.length - 1];
        if(listing.keys.length == 1) {
            delete listings[listingId];
        }else{
            listings[listingId].keys.pop();
        }
        uint256 sellersPay = price * sellersPercentage / 100;
        balances[seller] += sellersPay;
        balances[owner] += msg.value - sellersPay;
        
        gamesBought[msg.sender].push(BoughtGame(gameId,key));
     
        emit ItemBought(gameId,price, msg.sender);
    }

    function cancelListing(string memory listingId) external {
        Listings memory listing = listings[listingId];
        if(listing.owner != msg.sender) {
            revert OnlyOwnerCanCancelListing();
        }
        if(listing.keys.length == 0) {
            revert NoListingFound();
        }
        else if(listing.keys.length == 1) {
            delete listings[listingId];
        }else{
            listings[listingId].keys.pop();
        }
        emit ItemCancelled(listingId);
    }

    function withdraw() external {
        uint256 balance = balances[msg.sender];
        balances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: balance}("");
        if(!success) {
            revert TransferFailed();
        }
    }

    function ChangeSellersPercentage(uint256 newPercentage) external {
        if(msg.sender != owner) {
            revert("Only owner can change the percentage");
        }
        if (newPercentage > 100) {
            revert PercetageCantBeAbove100();
        }
        sellersPercentage = newPercentage;
    }

    function getGamesBought() external view returns(BoughtGame[] memory) {
        return gamesBought[msg.sender];
    }

    function getBalance() external view returns(uint256) {
        return balances[msg.sender];
    }
}