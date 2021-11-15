import {ethers, waffle} from 'hardhat'
import chai from 'chai'
import {solidity} from "ethereum-waffle";

import VariableUtilisationRatesCalculatorArtifact
  from '../../artifacts/contracts/VariableUtilisationRatesCalculator.sol/VariableUtilisationRatesCalculator.json';
import {VariableUtilisationRatesCalculator} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, toWei} from "../_helpers";

chai.use(solidity);

const {deployContract} = waffle;
const {expect} = chai;

//From left: Utilisation, expected Borrowing Rate, expected Deposit Rate
const TEST_TABLE =  [
  [0,	0.05,	0],
  [0.1,	0.1, 0.01],
  [0.2,	0.15,	0.03],
  [0.3,	0.2,	0.06],
  [0.4,	0.25,	0.1],
  [0.5,	0.3,	0.15],
  [0.6,	0.35,	0.21],
  [0.7,	0.4,	0.28],
  [0.8,	0.45,	0.36],
  [0.9,	0.6,	0.54],
  [1,	0.75,	0.75]
]

describe('VariableUtilisationRatesCalculator', () => {
  let sut: VariableUtilisationRatesCalculator,
    owner: SignerWithAddress,
    nonOwner: SignerWithAddress;

  beforeEach(async () => {
    [owner, nonOwner] = await getFixedGasSigners(10000000);
    sut = (await deployContract(
      owner,
      VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
  });

  const deposits = 100;

  TEST_TABLE.forEach(
    testCase => {
      const percentageUtilisation = testCase[0] * 100;
      it(`should calculate for ${percentageUtilisation}% utilisation`, async function () {
        let loansInWei = toWei((testCase[0] * deposits).toString());
        let depositsInWei = toWei(deposits.toString());

        const borrowingRate = fromWei(await sut.calculateBorrowingRate(loansInWei, depositsInWei));
        const depositRate = fromWei(await sut.calculateDepositRate(loansInWei, depositsInWei));

        expect(borrowingRate).to.be.closeTo(testCase[1], 0.000001);
        expect(depositRate).to.be.closeTo(testCase[2], 0.000001);
      });
    }
  )
});
