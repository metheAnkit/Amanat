// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockReputation {
    event Feedback(address indexed agent, int128 value, string tag);

    function giveFeedback(address agent, int128 value, string calldata tag) external {
        emit Feedback(agent, value, tag);
    }
}
