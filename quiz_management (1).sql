-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 05, 2026 at 03:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `quiz_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `quiz`
--

CREATE TABLE `quiz` (
  `quiz_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `image` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz`
--

INSERT INTO `quiz` (`quiz_id`, `name`, `image`) VALUES
(1, 'science quiz', 'logo.jpeg');

-- --------------------------------------------------------

--
-- Table structure for table `quiz_points`
--

CREATE TABLE `quiz_points` (
  `point_id` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_rounds`
--

CREATE TABLE `quiz_rounds` (
  `round_id` int(11) NOT NULL,
  `round_name` varchar(100) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `maximum_score` int(4) NOT NULL DEFAULT 100
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_rounds`
--

INSERT INTO `quiz_rounds` (`round_id`, `round_name`, `quiz_id`, `maximum_score`) VALUES
(1, 'Round 1', 1, 100),
(2, 'Round 2', 1, 100),
(3, 'Round 3', 1, 100),
(4, 'Round 4', 1, 100),
(5, 'Round 5', 1, 100),
(6, 'Round 6', 1, 100),
(7, 'Round 7', 1, 100),
(8, 'Round 8', 1, 100);

-- --------------------------------------------------------

--
-- Table structure for table `quiz_teams`
--

CREATE TABLE `quiz_teams` (
  `team_id` int(11) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `image` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_teams`
--

INSERT INTO `quiz_teams` (`team_id`, `team_name`, `quiz_id`, `image`) VALUES
(1, 'Team 1', 1, NULL),
(2, 'Team 2', 1, NULL),
(3, 'Team 3', 1, NULL),
(4, 'Team 4', 1, NULL),
(5, 'Team 5', 1, NULL),
(6, 'Team 6', 1, NULL),
(7, 'Team 7', 1, NULL),
(8, 'Team 8', 1, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `quiz`
--
ALTER TABLE `quiz`
  ADD PRIMARY KEY (`quiz_id`);

--
-- Indexes for table `quiz_points`
--
ALTER TABLE `quiz_points`
  ADD PRIMARY KEY (`point_id`),
  ADD UNIQUE KEY `unique_team_round` (`team_id`,`round_id`),
  ADD KEY `quiz_points_round_id` (`round_id`);

--
-- Indexes for table `quiz_rounds`
--
ALTER TABLE `quiz_rounds`
  ADD PRIMARY KEY (`round_id`),
  ADD KEY `quiz_round_quiz_id` (`quiz_id`);

--
-- Indexes for table `quiz_teams`
--
ALTER TABLE `quiz_teams`
  ADD PRIMARY KEY (`team_id`),
  ADD KEY `quiz_team_quiz_id` (`quiz_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `quiz`
--
ALTER TABLE `quiz`
  MODIFY `quiz_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `quiz_points`
--
ALTER TABLE `quiz_points`
  MODIFY `point_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quiz_rounds`
--
ALTER TABLE `quiz_rounds`
  MODIFY `round_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `quiz_teams`
--
ALTER TABLE `quiz_teams`
  MODIFY `team_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `quiz_points`
--
ALTER TABLE `quiz_points`
  ADD CONSTRAINT `quiz_points_round_id` FOREIGN KEY (`round_id`) REFERENCES `quiz_rounds` (`round_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `quiz_points_team_id` FOREIGN KEY (`team_id`) REFERENCES `quiz_teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `quiz_rounds`
--
ALTER TABLE `quiz_rounds`
  ADD CONSTRAINT `quiz_round_quiz_id` FOREIGN KEY (`quiz_id`) REFERENCES `quiz` (`quiz_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `quiz_teams`
--
ALTER TABLE `quiz_teams`
  ADD CONSTRAINT `quiz_team_quiz_id` FOREIGN KEY (`quiz_id`) REFERENCES `quiz` (`quiz_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
