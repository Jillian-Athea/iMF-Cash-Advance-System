<?php
include "headers.php";

class Resources {
  function getCashMethod() {
    include "connection.php";
    $sql = "SELECT * FROM tblcashmethod";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
  /**
   * Retrieves all cash methods from the database
   *
   * @return string JSON containing all cash methods
   */
    $cashMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($cashMethods);
  }

  function addCashMethod($json_payload) {
    include "connection.php";
    $data = json_decode($json_payload, true);

    if (!$data) {
        return json_encode(['error' => 'Invalid JSON payload.']);
    }

    $cashMethod = isset($data['cashMethod']) ? $data['cashMethod'] : null;
    $userId = isset($data['userId']) ? $data['userId'] : null;

    if (empty($cashMethod) || $userId === null) { // Allow userId to be 0 if that's a valid state, but not null/missing
        return json_encode(['error' => 'Cash method name or user ID is missing or invalid.']);
    }

    $sql = "INSERT INTO tblcashmethod (cashM_name, cashM_userId, cashM_datetime) VALUES (:cashMethod, :userId, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':cashMethod', $cashMethod);
    $stmt->bindParam(':userId', $userId);

    if ($stmt->execute()) {
      return json_encode(['success' => 'Cash method added successfully']);
    } else {
      // For debugging, you might log $stmt->errorInfo()
      return json_encode(['error' => 'Database error: Failed to add cash method.']);
    }
  }

  function editCashMethod($json) {
    include "connection.php";
    $data = json_decode($json, true);
    $cashMethodName = $data['cashMethod'];
    $cashMethodId = $data['cashMethodId'];
    $sql = "UPDATE tblcashmethod SET cashM_name = :cashMethodName WHERE cashM_id = :cashMethodId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':cashMethodName', $cashMethodName);
    $stmt->bindParam(':cashMethodId', $cashMethodId);
    if ($stmt->execute()) {
      return json_encode(['success' => 'Cash method updated successfully']);
    } else {
      return json_encode(['error' => 'Failed to update cash method']);
    }
  }

  function deleteCashMethod($json) {
    include "connection.php";
    $data = json_decode($json, true);
    $cashMethodId = $data['cashMethodId'];
    $sql = "DELETE FROM tblcashmethod WHERE cashM_id = :cashMethodId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':cashMethodId', $cashMethodId);
    if ($stmt->execute()) {
      return json_encode(['success' => 'Cash method deleted successfully']);
    } else {
      return json_encode(['error' => 'Failed to delete cash method']);
    }
  }

  function getStatusRequest() {
    include "connection.php";
    $sql = "SELECT * FROM tblstatusrequest";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $statusRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($statusRequests);
  }

  function addStatusRequest($json) {
    include "connection.php";
    $json = json_decode($json, true);
    $statusRequest = $json['statusRequest'];
    $userId = $json['userId'];
    $sql = "INSERT INTO tblstatusrequest (statusR_name, statusR_userId, statusR_datetime) VALUES (:statusRequest, :userId, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':statusRequest', $statusRequest);
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    return json_encode(['success' => 'Status request added successfully']);
  }

  function editStatusRequest($json) {
    include "connection.php";
    $data = json_decode($json, true);
    $statusRequestName = $data['statusRequest'];
    $statusRequestId = $data['statusRequestId'];
    $sql = "UPDATE tblstatusrequest SET statusR_name = :statusRequestName WHERE statusR_id = :statusRequestId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':statusRequestName', $statusRequestName);
    $stmt->bindParam(':statusRequestId', $statusRequestId);
    if ($stmt->execute()) {
      return json_encode(['success' => 'Status request updated successfully']);
    } else {
      return json_encode(['error' => 'Failed to update status request']);
    }
  }

  function deleteStatusRequest($json) {
    include "connection.php";
    $data = json_decode($json, true);
    $statusRequestId = $data['statusRequestId'];
    $sql = "DELETE FROM tblstatusrequest WHERE statusR_id = :statusRequestId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':statusRequestId', $statusRequestId);
    if ($stmt->execute()) {
      return json_encode(['success' => 'Status request deleted successfully']);
    } else {
      return json_encode(['error' => 'Failed to delete status request']);
    }
  }

  function getUserLevel() {
    include "connection.php";
    $sql = "SELECT * FROM tbluserlevel";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $userLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return json_encode($userLevels);
  }

  function addUserLevel($json) {
    include "connection.php";
    $json = json_decode($json, true);
    $userLevel = $json['userLevel'];
    $desc = $json['desc'];
    $userId = $json['userId'];
    $sql = "INSERT INTO tbluserlevel (userL_name, userL_desc, userL_userId, userL_datetime) VALUES (:userLevel, :desc, :userId, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':userLevel', $userLevel);
    $stmt->bindParam(':desc', $desc);
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    return json_encode(['success' => 'User level added successfully']);
  }

  function editUserLevel($json) {
    include "connection.php";
    $json = json_decode($json, true);
    $userLevel = $json['userLevel'];
    $userLevelDesc = $json['userLevelDesc'];
    $userLevelId = $json['userLevelId'];
    $sql = "UPDATE tbluserlevel SET userL_name = :userLevel, userL_desc = :userLevelDesc WHERE userL_id = :userLevelId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':userLevel', $userLevel);
    $stmt->bindParam(':userLevelDesc', $userLevelDesc);
    $stmt->bindParam(':userLevelId', $userLevelId);
    if ($stmt->execute()) {
      return json_encode(['success' => 'User level updated successfully']);
    } else {
      return json_encode(['error' => 'Failed to update user level']);
    }
  }

  function deleteUserLevel($json) {
    include "connection.php";
    $json = json_decode($json, true);
    $userLevelId = $json['userLevelId'];
    $sql = "DELETE FROM tbluserlevel WHERE userL_id = :userLevelId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':userLevelId', $userLevelId);
    $stmt->execute();
    return json_encode(['success' => 'User level deleted successfully']);
  }
}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$resources = new Resources();

switch ($operation) {
  case "getCashMethod":
    echo $resources->getCashMethod();
    break;
  case "addCashMethod":
    echo $resources->addCashMethod($json);
    break;
  case "editCashMethod":
    echo $resources->editCashMethod($json);
    break;
  case "deleteCashMethod":
    echo $resources->deleteCashMethod($json);
    break;
  case "getStatusRequest":
    echo $resources->getStatusRequest();
    break;
  case "addStatusRequest":
    echo $resources->addStatusRequest($json);
    break;
  case "editStatusRequest":
    echo $resources->editStatusRequest($json);
    break;
  case "deleteStatusRequest":
    echo $resources->deleteStatusRequest($json);
    break;
  case "getUserLevel":
    echo $resources->getUserLevel();
    break;
  case "addUserLevel":
    echo $resources->addUserLevel($json);
    break;
  case "editUserLevel":
    echo $resources->editUserLevel($json);
    break;
  case "deleteUserLevel":
    echo $resources->deleteUserLevel($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}