const { assert, expect } = require("chai")
const { deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("GameKeyMarketplace Unit Tests", function () {
      let gameKeyMarketplace, gameKeyMarketplaceContract
      const GAME_KEY = "GameKey1"
      const PRICE = ethers.parseEther("0.1")
      const LISTING_ID = "listingId"

      const GAME = [1, "name", "image", 123, ["tag"], ["genre"]]

      beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        user = accounts[1]
        await deployments.fixture(["all"])
        gameKeyMarketplaceContract =
          await ethers.getContract("GameKeyMarketplace")
        gameKeyMarketplace = gameKeyMarketplaceContract.connect(deployer)
      })

      it("lists a game key and can be bought", async function () {
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, GAME_KEY, PRICE)
        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)
        await userConnectedToGameKeyMarketplace.buyGameKey(
          LISTING_ID,
          GAME[0],
          deployer.address,
          PRICE,
          {
            value: PRICE,
          },
        )
        const deployerBalance = await gameKeyMarketplace.getBalance()
        assert.equal(deployerBalance.toString(), PRICE.toString())
      })
      it("lists multiple game keys with different prices", async function () {
        // List two game keys with different GAME_IDs and prices
        let GAME2 = [2, "name", "image", 123, ["tag"], ["genre"]]
        let GAME3 = [3, "name", "image", 123, ["tag"], ["genre"]]
        await gameKeyMarketplace.listGameKey(
          GAME2,
          "listingId2",
          "GameKey2",
          ethers.parseEther("0.2"),
        )
        await gameKeyMarketplace.listGameKey(
          GAME3,
          "listingId3",
          "GameKey3",
          ethers.parseEther("0.3"),
        )

        // Connect the user to the GameKeyMarketplace contract
        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)

        // Buy one of the listed game keys
        await userConnectedToGameKeyMarketplace.buyGameKey(
          "listingId2",
          GAME2[0],
          deployer.address,
          ethers.parseEther("0.2"),
          {
            value: ethers.parseEther("0.2"),
          },
        )

        // Get the deployer's balance after the purchase
        const deployerBalance = await gameKeyMarketplace.getBalance()

        // Assert that the deployer's balance is equal to the remaining game key's price
        assert.equal(
          deployerBalance.toString(),
          ethers.parseEther("0.2").toString(),
        )
      })

      it("withdraws balance from the contract", async function () {
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, GAME_KEY, PRICE)
        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)
        await userConnectedToGameKeyMarketplace.buyGameKey(
          LISTING_ID,
          GAME[0],
          deployer.address,
          PRICE,
          {
            value: PRICE,
          },
        )
        const initialBalance = await ethers.provider.getBalance(
          deployer.address,
        )
        await gameKeyMarketplace.withdraw()
        const finalBalance = await ethers.provider.getBalance(deployer.address)

        assert.isTrue(finalBalance > initialBalance)
      })

      it("can remove a listed game", async function () {
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, GAME_KEY, PRICE)
        await gameKeyMarketplace.cancelListing(LISTING_ID)

        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)

        try {
          // Try to buy a non-existent game key listing
          await userConnectedToGameKeyMarketplace.buyGameKey(
            LISTING_ID,
            GAME[0],
            deployer.address,
            PRICE,
            {
              value: PRICE,
            },
          )

          // If the transaction succeeds, fail the test
          assert.fail("Transaction should have reverted")
        } catch (error) {
          // Check if the error message matches the expected custom error
          assert.include(error.message, "NoListingFound")
        }
      })
      it("returns the games bought by the caller", async function () {
        // Create an instance of the contract connected to the user
        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)

        const GAME7 = [7, "name", "image", 123, ["tag"], ["genre"]]
        const GAME8 = [8, "name", "image", 123, ["tag"], ["genre"]]
        // List a few game keys for the user
        await gameKeyMarketplace.listGameKey(
          GAME7,
          "listingId7",
          "GameKey7",
          ethers.parseEther("0.2"),
        )
        await gameKeyMarketplace.listGameKey(
          GAME8,
          "listingId8",
          "GameKey8",
          ethers.parseEther("0.3"),
        )

        // Buy the listed game keys
        await userConnectedToGameKeyMarketplace.buyGameKey(
          "listingId7",
          GAME7[0],
          deployer.address,
          ethers.parseEther("0.2"),
          {
            value: ethers.parseEther("0.2"),
          },
        )
        await userConnectedToGameKeyMarketplace.buyGameKey(
          "listingId8",
          GAME8[0],
          deployer.address,
          ethers.parseEther("0.3"),
          {
            value: ethers.parseEther("0.3"),
          },
        )

        // Call the getGamesBought function to retrieve the games bought by the user
        const userGamesBought =
          await userConnectedToGameKeyMarketplace.getGamesBought()

        // Assert that the returned array has the expected length (number of games bought)
        assert.equal(userGamesBought.length, 2)

        // Assert that the first game in the array has the expected gameId and gameKey
        assert.equal(userGamesBought[0].gameId, 7)
        assert.equal(userGamesBought[0].key, "GameKey7")

        // Assert that the second game in the array has the expected gameId and gameKey
        assert.equal(userGamesBought[1].gameId, 8)
        assert.equal(userGamesBought[1].key, "GameKey8")
      })

      it("games get removed from listing when there is multiple of the same one", async function () {
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, GAME_KEY, PRICE)
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, "key2", PRICE)
        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)
        await userConnectedToGameKeyMarketplace.buyGameKey(
          LISTING_ID,
          GAME[0],
          deployer.address,
          PRICE,
          {
            value: PRICE,
          },
        )

        await userConnectedToGameKeyMarketplace.buyGameKey(
          LISTING_ID,
          GAME[0],
          deployer.address,
          PRICE,
          {
            value: PRICE,
          },
        )
        try {
          await userConnectedToGameKeyMarketplace.buyGameKey(
            LISTING_ID,
            GAME[0],
            deployer.address,
            PRICE,
            {
              value: PRICE,
            },
          )

          // If the transaction succeeds, fail the test
          assert.fail("Transaction should have reverted")
        } catch (error) {
          // Check if the error message matches the expected custom error
          assert.include(error.message, "NoListingFound")
        }
      })

      it("can cancel listing", async function () {
        // List a game key
        await gameKeyMarketplace.listGameKey(GAME, LISTING_ID, GAME_KEY, PRICE)

        const userConnectedToGameKeyMarketplace =
          gameKeyMarketplace.connect(user)

        // Cancel the listing
        await gameKeyMarketplaceContract.cancelListing(LISTING_ID)

        try {
          await userConnectedToGameKeyMarketplace.buyGameKey(
            LISTING_ID,
            GAME[0],
            deployer.address,
            PRICE,
            {
              value: PRICE,
            },
          )

          // If the transaction succeeds, fail the test
          assert.fail("Transaction should have reverted")
        } catch (error) {
          assert.include(error.message, "NoListingFound")
        }
      })
    })
