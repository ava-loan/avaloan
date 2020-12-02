const {expect} = require('chai');
const {BN, time} = require('@openzeppelin/test-helpers');

const CompoundingIndex = artifacts.require('CompoundingIndex');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));

contract('Compounding Index', function ([owner, user]) {

  describe('Simple progress', function () {

    var comp;

    before("deploy the Compounding index", async function () {
      comp = await CompoundingIndex.new();
      await comp.setRate(toWei("0.05"));
    });

    it("should set initial index 1", async function () {
      let start = fromWei(await comp.getIndex());
      expect(start).to.be.closeTo(1, 0.000001);
    });


    it("should increase index 1 year", async function () {
      await time.increase(time.duration.years(1));
      let oneYear = fromWei(await comp.getIndex());
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should increase index 2 years", async function () {
      await time.increase(time.duration.years(1));
      let twoYears = fromWei(await comp.getIndex());
      expect(twoYears).to.be.closeTo(1.105171, 0.000001);
    });

    it("should increase index 3 years", async function () {
      await time.increase(time.duration.years(1));
      let threeYears = fromWei(await comp.getIndex());
      expect(threeYears).to.be.closeTo(1.161834, 0.000001);
    });

    it("should increase index 4 years", async function () {
      await time.increase(time.duration.years(1));
      let threeYears = fromWei(await comp.getIndex());
      expect(threeYears).to.be.closeTo(1.221402, 0.000001);
    });
  });

  describe('Progress with rates change', function () {

    var comp;

    before("deploy the Compounding index", async function () {
      comp = await CompoundingIndex.new();
      await comp.setRate(toWei("0.05"));
    });

    it("should set initial index 1", async function () {
      let start = fromWei(await comp.getIndex());
      expect(start).to.be.closeTo(1, 0.000001);
    });

    it("should increase index 1 year on 5%", async function () {
      await time.increase(time.duration.years(1));
      let oneYear = fromWei(await comp.getIndex());
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should increase index 2 years on 10%", async function () {
      await comp.setRate(web3.utils.toWei("0.10"));
      await time.increase(time.duration.years(1));
      let twoYears = fromWei(await comp.getIndex());
      expect(twoYears).to.be.closeTo(1.161834, 0.000001);
    });

    it("should increase index 3 years", async function () {
      await comp.setRate(web3.utils.toWei("0.05"));
      await time.increase(time.duration.years(1));
      let threeYears = fromWei(await comp.getIndex());
      expect(threeYears).to.be.closeTo(1.221402, 0.000001);
    });
  });

  describe('Single user without snapshots', function () {

    var comp;

    before("deploy the Compounding index", async function () {
      comp = await CompoundingIndex.new();
      await comp.setRate(toWei("0.05"));
    });

    it("should set initial index 1", async function () {
      let start = fromWei(await comp.getIndex());
      expect(start).to.be.closeTo(1, 0.000001);
    });

    it("should increase index 1 year on 5%", async function () {
      await time.increase(time.duration.years(1));
      let oneYear = fromWei(await comp.getIndex());
      expect(oneYear).to.be.closeTo(1.051, 0.001);
    });

    it("should get user value with the default start", async function () {
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1051.271, 0.001);
    });

    it("should increase index 2 years", async function () {
      await time.increase(time.duration.years(1));
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1105.170, 0.001);
    });

    it("should increase index 3 years", async function () {
      await time.increase(time.duration.years(1));
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1161.834, 0.001);
    });
  });

  describe('Single user with snapshots', function () {

    var comp;

    before("deploy the Compounding index", async function () {
      comp = await CompoundingIndex.new();
      await comp.setRate(toWei("0.05"));
    });

    it("should set initial index 1", async function () {
      let start = fromWei(await comp.getIndex());
      expect(start).to.be.closeTo(1, 0.001);
    });

    it("should increase index 1 year on 5%", async function () {
      await time.increase(time.duration.years(1));
      let oneYear = fromWei(await comp.getIndex());
      expect(oneYear).to.be.closeTo(1.051, 0.001);
    });

    it("should set user snapshot", async function () {
      await comp.updateUser(user);
    });

    it("should get user value with the default start", async function () {
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1000.000, 0.001);
    });

    it("should increase user value 1 year from snapshot", async function () {
      await time.increase(time.duration.years(1));
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1051.271, 0.001);
    });

    it("should increase index 2 years after the snapshot", async function () {
      await time.increase(time.duration.years(1));
      let userValue = fromWei(await comp.getIndexedValue(toWei("1000"), user));
      expect(userValue).to.be.closeTo(1105.170, 0.001);
    });
  });

});

