// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IRateComputer} from "@adrastia-oracle/adrastia-periphery/contracts/rates/IRateComputer.sol";

interface PortfolioWithUtilizationRate {
    function utilization() external view returns (uint256);
}

contract LinearKinkInterestRateController is IRateComputer, IERC165 {
    using SafeCast for uint256;

    struct InterestRateParameters {
        uint32 minInterestRate;
        uint32 minInterestRateUtilizationThreshold;
        uint32 optimumInterestRate;
        uint32 optimumUtilization;
        uint32 maxInterestRate;
        uint32 maxInterestRateUtilizationThreshold;
    }

    InterestRateParameters public interestRateParameters;

    constructor(InterestRateParameters memory _interestRateParameters) {
        interestRateParameters = _interestRateParameters;
    }

    function getInterestRateParameters()
        public
        view
        returns (
            uint32,
            uint32,
            uint32,
            uint32,
            uint32,
            uint32
        )
    {
        InterestRateParameters memory _interestRateParameters = interestRateParameters;
        return (
            _interestRateParameters.minInterestRate,
            _interestRateParameters.minInterestRateUtilizationThreshold,
            _interestRateParameters.optimumInterestRate,
            _interestRateParameters.optimumUtilization,
            _interestRateParameters.maxInterestRate,
            _interestRateParameters.maxInterestRateUtilizationThreshold
        );
    }

    function computeRate(address portfolio) external view returns (uint64) {
        return computeRateInternal(portfolio).toUint64();
    }

    function supportsInterface(bytes4 interfaceID) public view override returns (bool) {
        return (interfaceID == type(IRateComputer).interfaceId || interfaceID == type(IERC165).interfaceId);
    }

    function computeRateInternal(address portfolio) internal view returns (uint256) {
        uint256 currentUtilization = PortfolioWithUtilizationRate(portfolio).utilization();
        (
            uint32 minInterestRate,
            uint32 minInterestRateUtilizationThreshold,
            uint32 optimumInterestRate,
            uint32 optimumUtilization,
            uint32 maxInterestRate,
            uint32 maxInterestRateUtilizationThreshold
        ) = getInterestRateParameters();
        if (currentUtilization <= minInterestRateUtilizationThreshold) {
            return minInterestRate;
        } else if (currentUtilization <= optimumUtilization) {
            return
                solveLinear(
                    currentUtilization,
                    minInterestRateUtilizationThreshold,
                    minInterestRate,
                    optimumUtilization,
                    optimumInterestRate
                );
        } else if (currentUtilization <= maxInterestRateUtilizationThreshold) {
            return
                solveLinear(
                    currentUtilization,
                    optimumUtilization,
                    optimumInterestRate,
                    maxInterestRateUtilizationThreshold,
                    maxInterestRate
                );
        } else {
            return maxInterestRate;
        }
    }

    function solveLinear(
        uint256 x,
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) internal pure returns (uint256) {
        return (y1 * (x2 - x) + y2 * (x - x1)) / (x2 - x1);
    }
}