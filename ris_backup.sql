-- MySQL dump 10.13  Distrib 8.4.8, for macos26.2 (arm64)
--
-- Host: 127.0.0.1    Database: registrar_information_system
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `access_type`
--

DROP TABLE IF EXISTS `access_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `access_type` (
  `access_id` int NOT NULL AUTO_INCREMENT,
  `access_name` varchar(50) NOT NULL,
  PRIMARY KEY (`access_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `access_type`
--

LOCK TABLES `access_type` WRITE;
/*!40000 ALTER TABLE `access_type` DISABLE KEYS */;
INSERT INTO `access_type` VALUES (1,'Student'),(2,'Alumni'),(3,'Both');
/*!40000 ALTER TABLE `access_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_contact_information`
--

DROP TABLE IF EXISTS `admin_contact_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_contact_information` (
  `admin_contact_id` int NOT NULL AUTO_INCREMENT,
  `admin_profile_id` int NOT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `personal_email_address` varchar(100) DEFAULT NULL,
  `house_unit_number` varchar(50) DEFAULT NULL,
  `street` varchar(150) DEFAULT NULL,
  `barangay` varchar(150) DEFAULT NULL,
  `municipality` varchar(150) DEFAULT NULL,
  `province` varchar(150) DEFAULT NULL,
  `country` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`admin_contact_id`),
  KEY `admin_profile_id` (`admin_profile_id`),
  CONSTRAINT `admin_contact_information_ibfk_1` FOREIGN KEY (`admin_profile_id`) REFERENCES `admin_profile` (`admin_profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_contact_information`
--

LOCK TABLES `admin_contact_information` WRITE;
/*!40000 ALTER TABLE `admin_contact_information` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_contact_information` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_profile`
--

DROP TABLE IF EXISTS `admin_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_profile` (
  `admin_profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `place_of_birth` varchar(150) DEFAULT NULL,
  `sex_at_birth` enum('Male','Female') DEFAULT NULL,
  PRIMARY KEY (`admin_profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `admin_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_profile`
--

LOCK TABLES `admin_profile` WRITE;
/*!40000 ALTER TABLE `admin_profile` DISABLE KEYS */;
INSERT INTO `admin_profile` VALUES (1,3,'Mhel',NULL,'Garcia',NULL,'1999-08-21',NULL,'Male'),(2,11,'Aron',NULL,'Cordova',NULL,NULL,NULL,NULL),(4,5,'Aron',NULL,'Cordova',NULL,NULL,NULL,NULL),(7,12,'Aron',NULL,'Cordova',NULL,NULL,NULL,NULL),(8,13,'Jocas',NULL,'Dela Cruz',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `admin_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumni`
--

DROP TABLE IF EXISTS `alumni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumni` (
  `alumni_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `alumni_type_id` int NOT NULL,
  PRIMARY KEY (`alumni_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `alumni_type_id` (`alumni_type_id`),
  CONSTRAINT `alumni_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `alumni_ibfk_2` FOREIGN KEY (`alumni_type_id`) REFERENCES `alumni_type` (`alumni_type_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumni`
--

LOCK TABLES `alumni` WRITE;
/*!40000 ALTER TABLE `alumni` DISABLE KEYS */;
INSERT INTO `alumni` VALUES (1,4,1);
/*!40000 ALTER TABLE `alumni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumni_academic_record`
--

DROP TABLE IF EXISTS `alumni_academic_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumni_academic_record` (
  `alumni_academic_id` int NOT NULL AUTO_INCREMENT,
  `alumni_profile_id` int NOT NULL,
  `student_number` varchar(50) DEFAULT NULL,
  `maiden_name` varchar(150) DEFAULT NULL,
  `year_of_graduation` year NOT NULL,
  `course` varchar(100) NOT NULL,
  PRIMARY KEY (`alumni_academic_id`),
  KEY `alumni_profile_id` (`alumni_profile_id`),
  CONSTRAINT `alumni_academic_record_ibfk_1` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile` (`alumni_profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumni_academic_record`
--

LOCK TABLES `alumni_academic_record` WRITE;
/*!40000 ALTER TABLE `alumni_academic_record` DISABLE KEYS */;
INSERT INTO `alumni_academic_record` VALUES (1,1,'1999-0001-TG-0',NULL,2003,'');
/*!40000 ALTER TABLE `alumni_academic_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumni_profile`
--

DROP TABLE IF EXISTS `alumni_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumni_profile` (
  `alumni_profile_id` int NOT NULL AUTO_INCREMENT,
  `alumni_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `place_of_birth` varchar(150) DEFAULT NULL,
  `sex_at_birth` enum('Male','Female') NOT NULL,
  PRIMARY KEY (`alumni_profile_id`),
  KEY `alumni_id` (`alumni_id`),
  CONSTRAINT `alumni_profile_ibfk_1` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`alumni_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumni_profile`
--

LOCK TABLES `alumni_profile` WRITE;
/*!40000 ALTER TABLE `alumni_profile` DISABLE KEYS */;
INSERT INTO `alumni_profile` VALUES (1,1,'Pedro',NULL,'Guevarra',NULL,'1999-08-21',NULL,'Male');
/*!40000 ALTER TABLE `alumni_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alumni_type`
--

DROP TABLE IF EXISTS `alumni_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumni_type` (
  `alumni_type_id` int NOT NULL AUTO_INCREMENT,
  `alumni_type` varchar(50) NOT NULL,
  PRIMARY KEY (`alumni_type_id`),
  UNIQUE KEY `alumni_type` (`alumni_type`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumni_type`
--

LOCK TABLES `alumni_type` WRITE;
/*!40000 ALTER TABLE `alumni_type` DISABLE KEYS */;
INSERT INTO `alumni_type` VALUES (2,'NON-SIS'),(1,'SIS');
/*!40000 ALTER TABLE `alumni_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `browser` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-06 09:04:38'),(2,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-06 09:05:07'),(3,1,'juan@gmail.com','student','login','Chrome','127.0.0.1','2026-03-06 09:05:54'),(4,1,'juan@gmail.com','student','logout','Chrome','127.0.0.1','2026-03-06 09:05:59'),(5,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-06 09:14:42'),(6,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-06 09:14:46'),(7,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-06 09:15:31'),(8,4,'alumni@gmail.com','alumni','logout','Safari','127.0.0.1','2026-03-06 09:15:35'),(9,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-07 04:29:48'),(10,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-07 04:29:52'),(11,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-07 04:35:38'),(12,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-07 05:03:51'),(13,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 05:04:32'),(14,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 05:08:07'),(15,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 05:09:10'),(16,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 05:34:50'),(17,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-07 07:08:22'),(18,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-07 07:09:14'),(19,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 07:09:21'),(20,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 10:29:28'),(21,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 10:29:32'),(22,6,'testadmin@pup.edu.ph','admin','admin_created','PostmanRuntime/7.51.1','127.0.0.1','2026-03-07 11:24:20'),(23,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 11:25:00'),(24,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-07 11:25:07'),(25,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-07 11:27:07'),(26,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 11:27:12'),(27,7,'testadmin1@pup.edu.ph','admin','admin_created','PostmanRuntime/7.51.1','127.0.0.1','2026-03-07 11:28:02'),(28,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 11:28:09'),(29,7,'testadmin1@pup.edu.ph','admin','login','Safari','127.0.0.1','2026-03-07 11:28:32'),(30,7,'testadmin1@pup.edu.ph','admin','logout','Safari','127.0.0.1','2026-03-07 11:29:02'),(31,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 11:29:09'),(32,5,'superadmin@gmail.com','super_admin','admin_deleted','Safari','127.0.0.1','2026-03-07 13:16:04'),(33,5,'superadmin@gmail.com','super_admin','admin_deleted','Safari','127.0.0.1','2026-03-07 13:16:08'),(34,11,'aronadmin@gmail.com','admin','admin_created','Safari','127.0.0.1','2026-03-07 13:41:36'),(35,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 14:08:04'),(36,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 14:08:11'),(37,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 14:22:31'),(38,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 14:22:35'),(39,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-07 16:16:44'),(40,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-07 16:16:48'),(41,5,'superadmin@gmail.com','super_admin','login','PostmanRuntime/7.51.1','127.0.0.1','2026-03-07 16:25:29'),(42,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:32:26'),(43,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:32:38'),(44,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:37:06'),(45,11,'aronadmin@gmail.com','admin','admin_updated','Safari','127.0.0.1','2026-03-08 00:41:18'),(46,11,'aronadmin@gmail.com','admin','admin_updated','Safari','127.0.0.1','2026-03-08 00:41:34'),(47,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 00:41:36'),(48,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:42:00'),(49,12,'aroncordova@gmail.com','admin','admin_created','Safari','127.0.0.1','2026-03-08 00:42:41'),(50,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 00:42:48'),(51,12,'aroncordova@gmail.com','admin','login','Safari','127.0.0.1','2026-03-08 00:43:25'),(52,12,'aroncordova@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-08 00:43:51'),(53,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:44:04'),(54,12,'aroncordova@gmail.com','admin','admin_updated','Safari','127.0.0.1','2026-03-08 00:44:10'),(55,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 00:44:13'),(56,12,'aroncordova@gmail.com','admin','login','Safari','127.0.0.1','2026-03-08 00:44:24'),(57,12,'aroncordova@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-08 00:44:29'),(58,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:44:33'),(59,12,'aroncordova@gmail.com','admin','admin_updated','Safari','127.0.0.1','2026-03-08 00:44:39'),(60,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 00:46:58'),(61,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 00:48:32'),(62,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 00:49:24'),(63,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 11:10:14'),(64,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 11:17:18'),(65,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 11:21:04'),(66,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 11:21:29'),(67,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 11:21:36'),(68,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-08 11:21:47'),(69,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-08 11:22:01'),(70,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-08 13:25:39'),(71,4,'alumni@gmail.com','alumni','logout','Safari','127.0.0.1','2026-03-08 13:25:42'),(72,2,'maria@gmail.com','student','login','Safari','127.0.0.1','2026-03-08 13:25:51'),(73,2,'maria@gmail.com','student','logout','Safari','127.0.0.1','2026-03-08 13:26:04'),(74,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-08 13:26:12'),(75,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-08 13:26:25'),(76,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 13:26:33'),(77,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 13:27:43'),(78,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:09:10'),(79,13,'jocas@gmail.com','super_admin','admin_created','Safari','127.0.0.1','2026-03-08 14:09:55'),(80,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 14:10:01'),(81,13,'jocas@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:10:53'),(82,13,'jocas@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 14:30:50'),(83,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:30:57'),(84,5,'superadmin@gmail.com','super_admin','login','PostmanRuntime/7.51.1','127.0.0.1','2026-03-08 14:34:28'),(85,5,'superadmin@gmail.com','super_admin','login','PostmanRuntime/7.51.1','127.0.0.1','2026-03-08 14:39:31'),(86,13,'jocas@gmail.com','super_admin','admin_updated','Safari','127.0.0.1','2026-03-08 14:40:18'),(87,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 14:40:59'),(88,13,'jocas@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:41:09'),(89,13,'jocas@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 14:43:48'),(90,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:44:19'),(91,13,'jocas@gmail.com','super_admin','admin_updated','Safari','127.0.0.1','2026-03-08 14:44:26'),(92,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 14:44:29'),(93,13,'jocas@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-08 14:44:38'),(94,13,'jocas@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-08 15:23:37'),(95,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-08 15:23:42'),(96,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-08 15:23:43'),(97,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-08 15:23:53'),(98,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-08 15:29:13'),(99,4,'alumni@gmail.com','alumni','logout','Safari','127.0.0.1','2026-03-08 15:48:31'),(100,4,'alumni@gmail.com','alumni','login','Safari','127.0.0.1','2026-03-09 06:26:00'),(101,4,'alumni@gmail.com','alumni','logout','Safari','127.0.0.1','2026-03-09 06:26:05'),(102,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-09 06:26:41'),(103,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-09 06:26:58'),(104,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-09 06:27:22'),(105,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-09 07:38:24'),(106,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-10 14:33:09'),(107,3,'mhel@gmail.com','admin','login','PostmanRuntime/7.51.1','127.0.0.1','2026-03-10 14:42:59'),(108,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-10 14:49:00'),(109,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-10 14:49:04'),(110,3,'mhel@gmail.com','admin','login','PostmanRuntime/7.51.1','127.0.0.1','2026-03-10 15:04:17'),(111,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-10 15:05:42'),(112,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-10 15:05:46'),(113,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-10 15:35:56'),(114,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-10 15:36:02'),(115,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-10 15:46:51'),(116,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-10 15:47:08'),(117,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-10 15:47:16'),(118,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-10 15:47:20'),(119,5,'superadmin@gmail.com','super_admin','logout','Safari','127.0.0.1','2026-03-10 15:47:31'),(120,3,'mhel@gmail.com','admin','login','Safari','127.0.0.1','2026-03-10 15:47:35'),(121,3,'mhel@gmail.com','admin','logout','Safari','127.0.0.1','2026-03-10 16:10:25'),(122,5,'superadmin@gmail.com','super_admin','login','Safari','127.0.0.1','2026-03-10 16:10:38'),(123,13,'jocas@gmail.com','super_admin','admin_updated','Safari','127.0.0.1','2026-03-10 16:17:35'),(124,1,'juan@gmail.com','student','login','Safari','127.0.0.1','2026-03-11 14:33:25'),(125,1,'juan@gmail.com','student','logout','Safari','127.0.0.1','2026-03-11 14:33:33');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificate_type`
--

DROP TABLE IF EXISTS `certificate_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificate_type` (
  `certificate_type_id` int NOT NULL AUTO_INCREMENT,
  `certificate_name` varchar(255) NOT NULL,
  `certificate_requirements` text NOT NULL,
  `certificate_process_period` varchar(100) NOT NULL,
  `access_id` int NOT NULL,
  PRIMARY KEY (`certificate_type_id`),
  KEY `access_id` (`access_id`),
  CONSTRAINT `certificate_type_ibfk_1` FOREIGN KEY (`access_id`) REFERENCES `access_type` (`access_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificate_type`
--

LOCK TABLES `certificate_type` WRITE;
/*!40000 ALTER TABLE `certificate_type` DISABLE KEYS */;
INSERT INTO `certificate_type` VALUES (1,'Certificate of GWA','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working day/s, 3 hour/s, 43 minute/s',3),(2,'Non Issuance of SO','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',2),(3,'Certification of Medium \nof Instruction','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',3),(4,'Certification of Medium of \nInstruction with Units','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',3),(5,'Certificate of Attendance','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',3),(6,'Certificate of  Graduation','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',2),(7,'Certified True Copy of Records','Student’s Request Letter – (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities – (1) Original Copy,\n2” x 2” Picture in Formal Attire – (2) Copies,\nOfficial Receipt for Documentary Stamp – (1) Original Copy,\nProof of Payment – (1) Original Copy,\nLong Brown Envelope – (1) Copy,\nAuthorization Letter and ID (if claimant is immediate family member) / Special Power of Attorney (SPA) if claimant is not an immediate family member – (1) Original Copy','3 working days, 3 hours, 43 minutes',3);
/*!40000 ALTER TABLE `certificate_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `course_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `course_name` varchar(200) NOT NULL,
  PRIMARY KEY (`course_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `course_name` (`course_name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'BBA-HRM','Bachelor of Science in Business Administration - Human Resource Management'),(2,'BBA-MM','Bachelor of Science in Business Administration - Marketing Management'),(3,'BSED-ENG','Bachelor of Science in Education - English'),(4,'BSED-MATH','Bachelor of Science in Education - Mathematics'),(5,'BSECE','Bachelor of Science in Electronics and Communications Engineering'),(6,'BSIT','Bachelor of Science in Information Technology'),(7,'BSME','Bachelor of Science in Mechanical Engineering'),(8,'BOA','Bachelor of Science in Office Administration'),(9,'BSPSYCH','Bachelor of Science in Psychology'),(10,'DIT','Diploma in Information Technology'),(11,'DOMT','Diploma in Office Management Technology');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_request`
--

DROP TABLE IF EXISTS `document_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_request` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `student_profile_id` int NOT NULL,
  `student_academic_id` int NOT NULL,
  `status_id` int NOT NULL,
  `request_purpose_id` int NOT NULL,
  `or_number` varchar(50) DEFAULT NULL,
  `receipt_date` date DEFAULT NULL,
  `number_of_copies` int NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  KEY `user_id` (`user_id`),
  KEY `student_profile_id` (`student_profile_id`),
  KEY `academic_record_id` (`student_academic_id`),
  KEY `status_id` (`status_id`),
  KEY `fk_dr_purpose` (`request_purpose_id`),
  CONSTRAINT `document_request_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `document_request_ibfk_2` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profile` (`student_profile_id`),
  CONSTRAINT `document_request_ibfk_3` FOREIGN KEY (`student_academic_id`) REFERENCES `student_academic_record` (`student_academic_id`),
  CONSTRAINT `document_request_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `request_status` (`status_id`),
  CONSTRAINT `fk_dr_purpose` FOREIGN KEY (`request_purpose_id`) REFERENCES `request_purpose` (`request_purpose_id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_request`
--

LOCK TABLES `document_request` WRITE;
/*!40000 ALTER TABLE `document_request` DISABLE KEYS */;
INSERT INTO `document_request` VALUES (1,1,1,1,3,6,'OR-2025-0001','2025-01-05',2,'2026-01-06 15:30:44'),(2,2,2,2,3,7,'OR-2025-0002','2025-01-03',1,'2026-01-06 15:30:44'),(3,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-06 15:52:49'),(4,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 02:03:01'),(5,1,1,1,5,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 02:03:06'),(6,1,1,1,5,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 04:00:50'),(7,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 04:00:56'),(8,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 04:01:00'),(9,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 05:11:15'),(10,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-07 05:11:22'),(11,2,2,2,4,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 13:21:23'),(12,2,2,2,1,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 13:21:32'),(13,2,2,2,1,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 13:21:36'),(14,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 13:21:47'),(15,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 13:21:50'),(16,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 14:46:45'),(17,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:22:11'),(18,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:22:37'),(19,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:22:38'),(20,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:22:39'),(21,1,1,1,5,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:24:01'),(22,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:24:54'),(23,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-09 15:33:54'),(24,1,1,1,3,6,'OR-2025-0003','2026-01-10',3,'2026-01-10 03:46:59'),(25,1,1,1,3,6,'OR-2025-0003','2026-01-10',3,'2026-01-10 03:47:30'),(26,1,1,1,3,6,'OR-2025-0003','2026-01-10',3,'2026-01-10 04:08:35'),(27,1,1,1,3,6,'OR-2025-0003','2026-01-10',3,'2026-01-10 04:10:40'),(28,1,1,1,3,7,'OR-2025-0003','2026-01-06',1,'2026-01-10 04:10:58'),(29,1,1,1,1,7,'OR-2025-0003','2026-01-06',1,'2026-01-10 04:11:44'),(30,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:14:36'),(31,1,1,1,1,7,'OR-2025-0003','2026-01-06',1,'2026-01-10 04:16:36'),(32,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:17:47'),(33,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:18:47'),(34,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:19:06'),(35,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:20:40'),(36,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:22:03'),(37,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:22:19'),(38,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:25:19'),(39,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:27:39'),(40,1,1,1,1,7,'OR-2025-0003','2026-01-10',1,'2026-01-10 04:40:48'),(41,1,1,1,1,7,'5','2026-01-10',2,'2026-01-10 04:55:59'),(42,1,1,1,5,6,'d','2026-01-10',34,'2026-01-10 04:58:08'),(43,1,1,1,3,6,'e','2026-01-10',2,'2026-01-10 06:11:24'),(44,1,1,1,3,6,'e','2026-01-10',1,'2026-01-10 07:55:17'),(45,1,1,1,3,6,'f','2026-01-10',1,'2026-01-10 12:08:05'),(46,1,1,1,1,6,'d','2026-01-10',1,'2026-01-10 12:26:51'),(47,1,1,1,1,6,'d','2026-01-10',10,'2026-01-10 13:40:21'),(48,1,1,1,5,6,'r','2026-01-01',100,'2026-01-10 16:17:21'),(49,1,1,1,2,6,'OR-RECIEPT-NUMBER','2026-01-12',1,'2026-01-11 22:39:58'),(50,1,1,1,3,6,'THIS IS AN OR','2026-01-12',2,'2026-01-12 00:52:12'),(51,1,1,1,2,7,'this is a receipt','2026-01-12',5,'2026-01-12 00:54:06'),(52,1,1,1,3,6,'0R-99990-R','2026-01-14',1,'2026-01-14 11:33:50'),(53,1,1,1,3,6,'dsafsadf','2026-01-15',100,'2026-01-15 09:04:29'),(54,1,1,1,1,6,'1234567','2026-02-22',1,'2026-02-22 11:02:24'),(55,1,1,1,1,6,'1234567','2026-02-23',1,'2026-02-23 04:56:36'),(56,1,1,1,1,6,'1234567','2026-02-25',1,'2026-02-25 09:26:31'),(57,1,1,1,1,6,'1234567','2026-02-25',1,'2026-02-25 09:26:38'),(58,1,1,1,1,6,'1234567','2026-02-25',1,'2026-02-25 09:29:53'),(59,2,2,2,1,2,'1234567','2026-02-25',1,'2026-02-25 09:31:49'),(60,1,1,1,1,6,'1234567','2026-02-25',1,'2026-02-25 10:46:34'),(61,1,1,1,1,6,'1234567','2026-03-02',1,'2026-03-02 05:52:20'),(62,1,1,1,2,7,'1234567','2026-03-02',1,'2026-03-02 05:54:43'),(63,1,1,1,2,7,'1234567','2026-03-02',1,'2026-03-02 06:03:27'),(64,1,1,1,3,7,'1234567','2026-03-02',1,'2026-03-02 06:03:36'),(65,1,1,1,3,6,'1234567','2026-03-02',1,'2026-03-02 06:03:50');
/*!40000 ALTER TABLE `document_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_type`
--

DROP TABLE IF EXISTS `document_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_type` (
  `document_type_id` int NOT NULL AUTO_INCREMENT,
  `document_name` varchar(255) NOT NULL,
  `document_description` text NOT NULL,
  `document_requirements` text NOT NULL,
  `document_process_period` varchar(100) NOT NULL,
  `access_id` int DEFAULT NULL,
  `exclusive_for` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`document_type_id`),
  KEY `access_id` (`access_id`),
  CONSTRAINT `document_type_ibfk_1` FOREIGN KEY (`access_id`) REFERENCES `access_type` (`access_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_type`
--

LOCK TABLES `document_type` WRITE;
/*!40000 ALTER TABLE `document_type` DISABLE KEYS */;
INSERT INTO `document_type` VALUES (1,'New Identification Card','This service is provided for students who are availing of a new identification card because they are transferees or shiftees. Old or resident students may also avail of this service if they wish to update the information in their old ID or if their IDs have been damaged or have become defective. -test aron','Current Registration Card - (1) Original Copy,\nForm PUP-NRID-5-OFSS-007 - (1) Original Copy,\nProof of payment - (1) Original Copy,\nRemarks: Copy the link to view the copy of new/application of ID\ndrive.google.com/file/d/1LvhKZbFzsLnoJEvlK_tnSSy6ew5g256T/view','2 working day/s, 23 minute/s',1,NULL),(2,'Replacement of Lost Identification Card','This request is processed by the OSS for students who need replacement of their identification cards due to loss/theft.','Current Registration Card - (1) Original Copy,\nApplication for Replacement of Lost Identification Card Form - (1) Original Copy,\nAttach with Parents/Guardian ID or Cedula (undergraduates only),\nProof of payment - (1) Original Copy,\nRemarks: Copy the link to view the copy of new/application of ID \nhttps://drive.google.com/file/d/150ijzdHofoMcJzc6L_fChnmM-HSe8GHo/view','2 working day/s, 23 minute/s',1,NULL),(3,'Consultation Service','It is a process that seeks and gives advice, opinion or information between clients and government services. This service includes guidance, counseling and psychological related interviews, test validation, and research.','Identification card/Registration certificate - (1) Original Copy,\nLetter of Request noted by Faculty in charged/Chair/Dean - (1) Original Copy,\nAppointment Slip - (1) Original Copy','23 minute/s',1,NULL),(4,'Counselling Service','It is a goal-oriented relationship between a professionally trained counselor and an individual seeking help for bringing about a meaningful awareness and understanding of the self and environment,improving planning and decision making, and formulating new ways of behaving, feeling, and thinking for problem resolution and/or development growth.','Identification card/Registration certificate - (1) Original Copy,\nReferral Slip, Call Slip, and Appointment Slip - (1) Original Copy EACH,\nPersonal data sheet - (1) Original Copy','44 minute/s',1,NULL),(5,'Recommendation Letter','A document which assesses the student’s attributes, characteristics, and abilities. It is issued by the counselor or psychologist to the requesting student who is asking for recommendation for academic or employment purposes.','ID card or Registration certificate - (1) Original Copy,\nCopy of Grades - (1) Photo Copy (from PUP SIS account),\nReferral Slip - (1) Original Copy,\nRemarks: Proceed to the Office of the Student\'s Services or Office of Admission Services','50 minute/s',1,NULL),(6,'Student/Alumni\nReferral and Recommendation','Letter that recommends a PUP Student/Alumni to an industry for a full–time, part-time, summer employment or internship opportunities.','Duly Accomplished Student/ Alumni Request Form - (1) Original Copy','53 minute/s',3,NULL),(7,'Permission to Conduct\nan Activity','The OSS processes requests for permits to conduct activities by the student councils, student publications and accredited student organizations’ for their meetings, assemblies, seminars, conferences, cultural presentations, and other activities.','Current Registration Card or ID Card (currently enrolled student); Alumni ID or TOR with picture (graduate) - (1) Original Copy,\nForm PUP-RPCA-5-OFSS-003 - (1) Original Copy (Secure from Student Affairs),\nRemarks: The form can be secured from the Office of Student Affairs and Services,\nLetter of Request - (1) Original Copy','7 minute/s',1,NULL),(8,'Application for Graduation\nSIS and Non-SIS','A student who has already completed all the academic requirements and cleared of all accountabilities can submit his application for graduation.','Accomplished printed copy of Application for Graduation (SIS Account) - (1) Original Copy,\nAccomplished Application for Graduation (Non-SIS) - (1) Original Copy,\nRemarks: Proof of payment, if not covered by RA 10931 covered otherwise known as Universal Access to Quality Tertiary Act of 2017','2 working day/s, 2 hour/s, 33 minute/s',1,NULL),(9,'Course/Subject Description','A Course/Subject Description is requested by the client to describe the content of the course taken by the student within the curriculum.','Student’s Request Letter - (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities - (1) Original Copy,\n2 (two) pcs. \'2x2\' picture in Formal Attire - (1) Original Copy,\nDocumentary stamp - (1) Original Copy,\nProof of payment - (1) Original Copy,\n1 Long Brown Envelope,\nReminder: When claiming documents: Authorization letter and ID if the claimant is an immediate family member. Special Power of Attorney (SPA) if the claimant is other than the immediate family.','3 working days, 3 hours, 42 minutes',1,NULL),(10,'Correction of Entry of Grade,\nCompletion of Incomplete Grade,\nLate Reporting of Grade','Correction of entry should be accomplished within a period of one semester upon receipt of grade and the Late Reporting of Grades Form should be accomplished within a period of one year. Incomplete (Inc) is temporarily given to a student who may pass the subject, but not yet complied with all its requirements. Such requirements shall be satisfied within one year from the end of the term; otherwise the grade shall be lapsed “No Credit (N) or a failing mark.','Accomplished Completion Form - (3) Original Copies (Download from PUP website),\nPhotocopy of Class Record of the Faculty - 1 Photo Copy,\nNotarized Affidavit for Change of Grade signed by Professor - Original Copy,\nProof of payment - (1) Original Copy,\nOfficial Logbook - (1) Original Copy','5 working day/s, 59 minute/s',1,NULL),(11,'Course Accreditation\n(SHS to Bridge)','Subjects taken in another Senior High School shall be accredited to Bridge Course Subject only and zero units as required in the PUP curriculum.','Accomplished Course Accreditation Form (Download from PUP Website) - (1) Original Copy,\nCurriculum Sheet used upon admission - (1) Original Copy,\nInformative copy of grades for PUP SHS graduates - (1) Original Copy,\nForm 138 or 137 for graduates from other Senior High School- (1) Original Copy','1 working day/s, 5 hour/s, 30 minute/s',1,NULL),(12,'Course Accreditation\n(Transferees)','Subjects taken in another university/college of recognized standing not exceeding 30 units including P.E. and NSTP shall be accredited provided they have the same subject description as those in the PUP curriculum. All subjects taken by transferees from branches and campuses of PUP are accredited provided the transferring student is enrolled in the same course. If not, only mandatory and general education subjects are accredited.','A. FOR TRANSFEREES FROM ANOTHER UNIVERSITY/COLLEGE:\n1. Accomplished Course Accreditation Form (Download from PUP Website)\n2. Curriculum Sheet upon Admission to PUP - (1) Original Copy\n3. Certified Copy of TOR with Remarks: \'Copy for PUP\' - (1) Original Copy\n4. Subject Description taken from other school/university - (1) Original Copy\n5. Proof of Payment - (1) Original Copy\nB. FOR TRANSFEREES FROM PUP BRANCH/CAMPUS TO MAIN:\n1. Accomplished Accreditation Form (Download from PUP Website)\n2. Curriculum Sheet upon Admission to PUP - (1) Original Copy\n3. Certified Copy of TOR with Remarks: \'Copy for PUP\' - (1) Original Copy','1 working day/s, 5 hour/s, 30 minute/s',1,NULL),(13,'CERTIFICATION','A student/client can apply for these certifications as needed while a Certificate of Transfer Credential/Honorable Dismissal is a document certifying that a student has no pending accountabilities thereby he/she is honorably dismissed from the University.','Student’s Request Letter - (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities - (1) Original Copy,\n2 (two) pcs of 2x2 pictures in Formal Attire (Uploaded to ODRS),\nOfficial receipt for documentary stamp - (1) Original Copy,\nProof of payment - (1) Original Copy,\n1 Long Brown Envelope','3 working day/s, 3 hour/s, 43 minute/s',3,NULL),(14,'CAV/APOSTILE','A graduated student/client can apply for the Certification, Verification, Authentication (CAV/Apostile) and submits a photocopy of his credentials to be certified and put in a sealed envelope for DFA, CHED or PRC.','Student’s Request Letter - (1) Original Copy,\nGeneral Clearance showing the client is cleared of all accountabilities - (1) Original Copy,\nLetter request addressed to CHED Regional Director (for CAV-CHED request only) - (1) Original Copy,\n2 (two) pcs of 2x2 pictures in Formal Attire,\nProof of payment - (1) Original Copy,\n1 Long Brown Envelope','2 working days, 7 hours, 10 minutes',2,NULL),(15,'Transcript of Records (TOR)','For process requests for credentials of students and alumni, transcript of Records (TOR) is one of the credentials requested. This is an official copy of a student’s academic subjects enrolled/taken with corresponding remarks/grade given by course faculty with signature of the University Registrar and counter signed by a student record staff.','A. FIRST COPY (For New Graduates/Transferees):\n1. Accomplished and printed copy of the application and payment voucher from the Campus registrar. - (1) Original (To be Printed by the Registrar)\n2. General Clearance showing the client is cleared of all accountabilities - (1) Original Copy (Printed from SIS)\n3. Certificate of Candidacy - (1) Original (Printed from SIS)\n4. Certificate of Conferment of Degree (Dummy Diploma) - (1) Original Copy (Remarks: Awarded during graduation ceremony)\n5. 2 (two) pcs of 2x2 picture in Academic Gown/Toga\n6. Documentary stamp - (1) Sample\n7. Proof of payment (if not covered by RA 10931) - (1) Original Copy\nReminder: When claiming documents: 8.1 Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family.\nB. SECOND AND SUCCEEDING COPIES:\n1. Letter of request by the student - (1) Original (To Registrar\'s Office)\n2. 2 (two) pcs of2x2 picture in Formal Attire (To be submitted to the Admission and Registration Office)\n3. Documentary Stamp - (1) Sample\n4. Proof of Payment - (1) Original Copy\n5. Acknowledged/Signed Copy of Transfer - (1) Original (Remarks: School where applicant is presently enrolled)\nReminder: .When claiming documents: a.Authorization letter and ID if claimant is immediate family member Special Power of Attorney (SPA) if the claimant is other than the immediate family.','8 working day/s, 5 hour/s, 20 minute/s',3,NULL),(16,'Informative Copy of Grades','Processes certified true copy of complete academic records or informative copy of credits and grades previously taken, duly signed by the Campus Registrar and Campus Director.','Letter of request stating the purpose - (1) Original Copy,\nProof of payment - (1) Original Copy,\nPUP School Identification Card - (1) Original Copy,\nAuthorization letter (if claimed by a representative) - (1) Original Copy','1 working day/s, 1 hour/s, 18 minute/s',1,NULL),(17,'Request for Leave of Absences','A student intends to take a leave of absence exceeding one semester but not to exceed one academic year shall file a letter of intent with the Academic Head concerned for approval, stating the reason for leave. If the leave exceeds one academic year, he/she shall lose status as a student in residence','Letter of intent addressed to the Campus Registrar - (1) Original Copy,\nDocuments as proof (e.g., Medical Certificate, Employment Order) - (1) Original Copy,\nApplication for Change of Enrollment (ACE) if currently enrolled - (1) Original Copy','2 working day/s, 6 hour/s, 29 minute/s',1,NULL),(18,'Re-Admission','Students considered for re-admission depending on their previous scholastic performance, and the availability of slots. He/she must have complied with all other requirements for re-admission. If re-admitted within two (2) years, returning students shall be allowed to follow their old course of study or curriculum; otherwise they shall follow the curriculum existing at the time of their re-admission.','Accomplished re-admission form (To be uploaded in the ODRS) - (1) Original Copy,\nInformative Copy of Grades/Transcript of Records - (1) Original Copy,\nCurriculum Sheet - (1) Original Copy,\nLatest Certificate of Registration - (1) Original Copy,\n2 (two) pcs of 2x2 colored picture (White background with name) - (2) Samples,\nOfficial Receipt for re-admission - (1) Original Copy,\nMedical Clearance (PUP Clinic or Government Clinic) - (1) Original Copy','2 working day/s, 6 hour/s, 41 minute/s',1,NULL),(19,'Good Moral Character','Issued for scholarship, employment, further studies, or board exams.','Registration Card or Identification Card (for currently enrolled student); Alumni ID or TOR with picture (for graduate) - (1) Original Copy,\nForm PUP-ACGM-5-OFSS-0007 (Secure from Student Affairs) - (1) Original Copy,\nProof of Payment - (1) Original Copy','12 minute/s',1,NULL),(20,'new document ni aron','hahaha','- picture ko','1 day',NULL,'Alumni');
/*!40000 ALTER TABLE `document_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (5,'0001_01_01_000000_create_users_table',1),(6,'0001_01_01_000001_create_cache_table',1),(7,'0001_01_01_000002_create_jobs_table',1),(8,'2026_01_06_130225_create_personal_access_tokens_table',1),(9,'2026_02_11_152136_add_auth_fields_to_system_user',2),(10,'2026_03_07_000001_add_status_to_users_table',3),(11,'2026_03_07_000002_nullable_admin_profile_fields',4);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=418 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (416,'App\\Models\\SystemUser',5,'ris_token','e08564eb1f6daa1337883a92ad1d9b7619bf7f39b6d71877ecb7f4dcee43fd3d','[\"*\"]','2026-03-10 16:33:50',NULL,'2026-03-10 16:10:38','2026-03-10 16:33:50');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_certificate`
--

DROP TABLE IF EXISTS `request_certificate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_certificate` (
  `request_certificate_id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `certificate_type_id` int NOT NULL,
  PRIMARY KEY (`request_certificate_id`),
  KEY `request_id` (`request_id`),
  KEY `certificate_type_id` (`certificate_type_id`),
  CONSTRAINT `request_certificate_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_request` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_certificate`
--

LOCK TABLES `request_certificate` WRITE;
/*!40000 ALTER TABLE `request_certificate` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_certificate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_document`
--

DROP TABLE IF EXISTS `request_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_document` (
  `request_document_id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `document_type_id` int NOT NULL,
  PRIMARY KEY (`request_document_id`),
  KEY `request_id` (`request_id`),
  KEY `document_type_id` (`document_type_id`),
  CONSTRAINT `request_document_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_request` (`request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_document`
--

LOCK TABLES `request_document` WRITE;
/*!40000 ALTER TABLE `request_document` DISABLE KEYS */;
INSERT INTO `request_document` VALUES (1,1,20),(2,2,16),(3,40,2),(4,41,1),(5,42,1),(6,42,3),(7,42,2),(8,43,4),(9,44,1),(10,44,2),(11,44,3),(12,44,4),(13,44,5),(14,44,7),(15,44,6),(16,45,4),(17,46,4),(18,47,1),(19,48,4),(20,49,4),(21,50,4),(22,51,1),(23,51,3),(24,51,2),(25,51,4),(26,52,4),(27,53,4),(28,54,4),(29,55,4),(30,58,4),(31,59,1),(32,60,4),(33,61,4),(34,61,1),(35,62,1),(36,65,4);
/*!40000 ALTER TABLE `request_document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_history`
--

DROP TABLE IF EXISTS `request_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_history` (
  `request_history_id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `old_status_id` int NOT NULL,
  `new_status_id` int NOT NULL,
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_history_id`),
  KEY `request_id` (`request_id`),
  KEY `fk_old_status` (`old_status_id`),
  KEY `fk_new_status` (`new_status_id`),
  CONSTRAINT `fk_new_status` FOREIGN KEY (`new_status_id`) REFERENCES `request_status` (`status_id`),
  CONSTRAINT `fk_old_status` FOREIGN KEY (`old_status_id`) REFERENCES `request_status` (`status_id`),
  CONSTRAINT `request_history_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_request` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_history`
--

LOCK TABLES `request_history` WRITE;
/*!40000 ALTER TABLE `request_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_purpose`
--

DROP TABLE IF EXISTS `request_purpose`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_purpose` (
  `request_purpose_id` int NOT NULL AUTO_INCREMENT,
  `purpose_name` varchar(100) NOT NULL,
  PRIMARY KEY (`request_purpose_id`),
  UNIQUE KEY `purpose_name` (`purpose_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_purpose`
--

LOCK TABLES `request_purpose` WRITE;
/*!40000 ALTER TABLE `request_purpose` DISABLE KEYS */;
INSERT INTO `request_purpose` VALUES (5,'Board Exam'),(1,'DFA'),(3,'Employment - Abroad'),(2,'Employment - Local'),(4,'Further Studies'),(7,'Personal Copy'),(6,'Scholarship');
/*!40000 ALTER TABLE `request_purpose` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_status`
--

DROP TABLE IF EXISTS `request_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_status` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_status`
--

LOCK TABLES `request_status` WRITE;
/*!40000 ALTER TABLE `request_status` DISABLE KEYS */;
INSERT INTO `request_status` VALUES (1,'Pending'),(2,'Ready to claim'),(3,'Completed'),(4,'Processing'),(5,'Rejected'),(6,'Ready');
/*!40000 ALTER TABLE `request_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (3,'admin'),(2,'alumni'),(1,'student'),(4,'super_admin');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_academic_record`
--

DROP TABLE IF EXISTS `student_academic_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_academic_record` (
  `student_academic_id` int NOT NULL AUTO_INCREMENT,
  `student_profile_id` int NOT NULL,
  `student_number` varchar(50) NOT NULL,
  `course` varchar(100) NOT NULL,
  `course_id` int DEFAULT NULL,
  `year_level` int DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `school_year_admitted` varchar(20) DEFAULT NULL,
  `last_school_year_attended` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`student_academic_id`),
  UNIQUE KEY `uq_student_number` (`student_number`),
  KEY `student_profile_id` (`student_profile_id`),
  KEY `fk_sar_course` (`course_id`),
  CONSTRAINT `fk_sar_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`),
  CONSTRAINT `student_academic_record_ibfk_1` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profile` (`student_profile_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_academic_record`
--

LOCK TABLES `student_academic_record` WRITE;
/*!40000 ALTER TABLE `student_academic_record` DISABLE KEYS */;
INSERT INTO `student_academic_record` VALUES (1,1,'2022-00001-TG','BS Information Technology',NULL,NULL,NULL,'2022-2023','2024'),(2,2,'2018-04567-TG','BS Business Administration',NULL,NULL,NULL,'2018-2019','2021-2022');
/*!40000 ALTER TABLE `student_academic_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_contact_information`
--

DROP TABLE IF EXISTS `student_contact_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_contact_information` (
  `student_contact_id` int NOT NULL AUTO_INCREMENT,
  `student_profile_id` int NOT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `personal_email_address` varchar(100) DEFAULT NULL,
  `house_unit_number` varchar(50) DEFAULT NULL,
  `street` varchar(150) DEFAULT NULL,
  `barangay` varchar(150) DEFAULT NULL,
  `municipality` varchar(150) DEFAULT NULL,
  `province` varchar(150) DEFAULT NULL,
  `country` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`student_contact_id`),
  KEY `student_profile_id` (`student_profile_id`),
  CONSTRAINT `student_contact_information_ibfk_1` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profile` (`student_profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_contact_information`
--

LOCK TABLES `student_contact_information` WRITE;
/*!40000 ALTER TABLE `student_contact_information` DISABLE KEYS */;
INSERT INTO `student_contact_information` VALUES (1,1,'09171234567',NULL,NULL,'Taguig City',NULL,NULL,NULL,NULL),(2,2,'09179876543',NULL,NULL,'Taguig City',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `student_contact_information` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profile`
--

DROP TABLE IF EXISTS `student_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profile` (
  `student_profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `place_of_birth` varchar(150) DEFAULT NULL,
  `sex_at_birth` enum('Male','Female') NOT NULL DEFAULT 'Male',
  PRIMARY KEY (`student_profile_id`),
  UNIQUE KEY `uq_student_profile_user_id` (`user_id`),
  CONSTRAINT `student_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profile`
--

LOCK TABLES `student_profile` WRITE;
/*!40000 ALTER TABLE `student_profile` DISABLE KEYS */;
INSERT INTO `student_profile` VALUES (1,1,'Juan','Santos','Dela Cruz',NULL,'2002-05-14',NULL,'Male'),(2,2,'Maria','Lopez','Reyes',NULL,'1999-08-21',NULL,'Female');
/*!40000 ALTER TABLE `student_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `status` enum('Activated','Deactivated') NOT NULL DEFAULT 'Activated',
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `idp_user_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'Activated','juan@gmail.com','$2y$12$9R001SN/CMBfShMqezgTMO5RocAaqrMFJUMmyN2mSCk5BmFfzf5w6',NULL),(2,1,'Activated','maria@gmail.com','$2y$12$QIwa9MvQVnAG/lbmrpKq4e32qopoU0x0OLkMkTjH6eJxGAGBLS8BK',NULL),(3,3,'Activated','mhel@gmail.com','$2y$12$QIwa9MvQVnAG/lbmrpKq4e32qopoU0x0OLkMkTjH6eJxGAGBLS8BK',NULL),(4,2,'Activated','alumni@gmail.com','$2y$12$Wy6xOE.Mr/wmNDeynkJnheBsHdDi83IFTAZdH530ifMmfMv4KyTxu',NULL),(5,4,'Activated','superadmin@gmail.com','$2y$12$9R001SN/CMBfShMqezgTMO5RocAaqrMFJUMmyN2mSCk5BmFfzf5w6','2026-03-05 12:56:40'),(11,3,'Activated','aronadmin@gmail.com','$2y$12$mOSZLzHamA2CWfR3sbHRFOxO74fChzTRkIi0UaG5wBjWwcD1R9dni','2026-03-07 13:41:36'),(12,3,'Activated','aroncordova@gmail.com','$2y$12$XmIOBZ2tjs2tNrMWO2BTCuFSmmcGddJ/daCp9QPrfnXJG3baFesN.','2026-03-08 00:42:41'),(13,4,'Deactivated','jocas@gmail.com','$2y$12$.1brT.y5PqMdgX1/V9Dyb.AzxYoGeqPdpDoR5YuN3Cc8FVnLYvamS','2026-03-08 14:09:55');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-12 14:32:02
