<?php
include "headers.php";

class Employee {

  function CashMethod()
  {
    include "connection.php";

    $sql = "SELECT * FROM tblcashmethod";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
      $cashMethod = $stmt->fetchAll(PDO::FETCH_ASSOC);
      return json_encode($cashMethod);
    }
    return json_encode([]);
  }

  function statusRequest()
  {
    include "connection.php";

    $sql = "SELECT * FROM tblstatusrequest";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
      $statusRequest = $stmt->fetchAll(PDO::FETCH_ASSOC);
      return json_encode($statusRequest);
    }
    return json_encode([]);
  }

  function getUserAvailableLimit($json)
  {
    include "connection.php";
    
    $data = json_decode($json, true);
    if (!isset($data['userId'])) {
      return json_encode(['error' => 'User ID is required']);
    }
    
    try {
      // Get the user's base available limit
      $sql = "SELECT user_availableLimit as available_limit, user_status FROM tbluser WHERE user_id = :userId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':userId', $data['userId']);
      $stmt->execute();
      
      $baseLimit = 0;
      $userStatus = null; // Initialize userStatus
      if ($stmt->rowCount() > 0) {
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $baseLimit = floatval($result['available_limit']);
        $userStatus = $result['user_status']; // Fetch user_status
      }

      // Get the sum of all completed transactions
      $completedSql = "SELECT SUM(a.req_budget) as total_completed
                      FROM tblrequest a
                      INNER JOIN (
                          SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                          FROM tblrequeststatus
                          GROUP BY reqS_reqId
                      ) latest_status ON a.req_id = latest_status.reqS_reqId
                      INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
                      INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                      WHERE a.req_userId = :userId 
                      AND c.statusR_name = 'Completed'";
      
      $completedStmt = $conn->prepare($completedSql);
      $completedStmt->bindParam(':userId', $data['userId']);
      $completedStmt->execute();
      
      $completedResult = $completedStmt->fetch(PDO::FETCH_ASSOC);
      $totalCompleted = floatval($completedResult['total_completed'] ?? 0);

      // Calculate remaining limit
      $remainingLimit = $baseLimit - $totalCompleted;
      
      return json_encode([
        'available_limit' => $remainingLimit,
        'base_limit' => $baseLimit,
        'total_completed' => $totalCompleted,
        'user_status' => $userStatus // Include user_status in the response
      ]);
      
    } catch (PDOException $e) {
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function addRequestCash($json)
  {
    include "connection.php";

    $json = json_decode($json, true);

    try {
      $conn->beginTransaction();

      // First, get the status ID for "Pending" status
      $statusSql = "SELECT statusR_id FROM tblstatusrequest WHERE statusR_name = 'Pending' LIMIT 1";
      $statusStmt = $conn->prepare($statusSql);
      $statusStmt->execute();
      $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);

      if (!$statusResult) {
        throw new PDOException("Pending status not found in status request table");
      }

      $pendingStatusId = $statusResult['statusR_id'];

      // Check if the request amount is within the available limit
      $limitSql = "SELECT user_availableLimit FROM tbluser WHERE user_id = :userId";
      $limitStmt = $conn->prepare($limitSql);
      $limitStmt->bindParam(':userId', $json['userId']);
      $limitStmt->execute();
      
      $availableLimit = 0;
      if ($limitStmt->rowCount() > 0) {
        $limitResult = $limitStmt->fetch(PDO::FETCH_ASSOC);
        $availableLimit = $limitResult['user_availableLimit'];
      }
      
      if ($json['budget'] > $availableLimit) {
        return json_encode(['error' => 'Request amount exceeds your available limit of ₱' . number_format($availableLimit, 2)]);
      }

      $sql = "INSERT INTO tblrequest (req_userId, req_purpose, req_desc, req_budget, req_cashMethodId, req_datetime ) 
              VALUES (:userId, :purpose, :desc, :budget, :cashMethodId, :datetime)";

      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':userId', $json['userId']);
      $stmt->bindParam(':purpose', $json['purpose']);
      $stmt->bindParam(':desc', $json['desc']);
      $stmt->bindParam(':budget', $json['budget']);
      $stmt->bindParam(':cashMethodId', $json['cashMethodId']);
      $stmt->bindParam(':datetime', $json['datetime']);

      if ($stmt->execute()) {
        $requestId = $conn->lastInsertId();
        
        // Insert into tblrequeststatus with the correct pending status ID
        $statusSql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:requestId, :statusId, :datetime)";
        $statusStmt = $conn->prepare($statusSql);
        $statusStmt->bindParam(':requestId', $requestId);
        $statusStmt->bindParam(':statusId', $pendingStatusId);
        $statusStmt->bindParam(':datetime', $json['datetime']);

        if ($statusStmt->execute()) {
          $conn->commit();
          return json_encode(['success' => true]);
        }
      }

      $conn->rollBack();
      return json_encode(['error' => 'Failed to add request: ' . implode(" ", $stmt->errorInfo())]);

    } catch (PDOException $e) {
      $conn->rollBack();
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function getRequestCash($json)
  {
    include "connection.php";

    try {
        // Decode the JSON input
        $data = json_decode($json, true);
        if (!$data || !isset($data['userId'])) {
            return json_encode(['error' => 'Invalid input data']);
        }

        $sql = "SELECT 
                a.req_id, 
                a.req_userId, 
                a.req_purpose, 
                a.req_desc,
                a.req_budget, 
                a.req_cashMethodId,
                c.statusR_name,
                b.reqS_datetime
                FROM tblrequest a
                INNER JOIN (
                      SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                      FROM tblrequeststatus
                      GROUP BY reqS_reqId
                  ) latest_status ON a.req_id = latest_status.reqS_reqId
                  INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
                INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                WHERE a.req_userId = :userId
                ORDER BY a.req_datetime DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':userId', $data['userId']);
        $stmt->execute();
        
        $requestCash = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return json_encode($requestCash); // This will return [] if no results

    } catch (PDOException $e) {
        return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function getRequestStatusHistory($json)
  {
    include "connection.php";
    $data = json_decode($json, true);
    if (!isset($data['requestId']) || !isset($data['userId'])) {
        return json_encode(['error' => 'Request ID and User ID are required']);
    }

    try {
        $sql = "SELECT 
                    b.reqS_id,
                    b.reqS_reqId,
                    b.reqS_statusId,
                    b.reqS_datetime,
                    c.statusR_name
                FROM tblrequeststatus b
                INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                INNER JOIN tblrequest r ON b.reqS_reqId = r.req_id
                WHERE b.reqS_reqId = :requestId AND r.req_userId = :userId
                ORDER BY b.reqS_datetime ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':requestId', $data['requestId']);
        $stmt->bindParam(':userId', $data['userId']);
        $stmt->execute();

        $statusHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return json_encode($statusHistory);

    } catch (PDOException $e) {
        return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function getUserProfile($json)
  {
    include "connection.php";

    $data = json_decode($json, true);
    if (!isset($data['userId'])) {
      return json_encode(['error' => 'User ID is required']);
    }

    $sql = "SELECT user_id, user_firstname, user_lastname, user_email, user_contactNumber, user_address, user_username, user_password FROM tbluser WHERE user_id = :userId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':userId', $data['userId']);
    $stmt->execute();

    $userProfile = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode($userProfile);
  }

  function editUserProfile($json)
  {
    include "connection.php";

    $data = json_decode($json, true);
    if (!isset($data['userId'])) {
      return json_encode(['error' => 'User ID is required']);
    }

    try {
      // First verify the current password
      $verifySql = "SELECT user_password FROM tbluser WHERE user_id = :userId";
      $verifyStmt = $conn->prepare($verifySql);
      $verifyStmt->bindParam(':userId', $data['userId']);
      $verifyStmt->execute();
      
      if ($verifyStmt->rowCount() === 0) {
        return json_encode(['error' => 'User not found']);
      }

      $userData = $verifyStmt->fetch(PDO::FETCH_ASSOC);
      if (!password_verify($data['currentPassword'], $userData['user_password'])) {
        return json_encode(['error' => 'Current password is incorrect']);
      }

      // Hash the new password if provided, otherwise keep the current one
      $hashedPassword = isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : $userData['user_password'];

      $sql = "UPDATE tbluser SET 
              user_firstname = :firstname, 
              user_lastname = :lastname, 
              user_email = :email, 
              user_phone = :phone, 
              user_address = :address, 
              user_username = :username, 
              user_password = :password 
              WHERE user_id = :userId";
              
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':userId', $data['userId']);
      $stmt->bindParam(':firstname', $data['firstname']);
      $stmt->bindParam(':lastname', $data['lastname']);
      $stmt->bindParam(':email', $data['email']);
      $stmt->bindParam(':phone', $data['phone']);
      $stmt->bindParam(':address', $data['address']);
      $stmt->bindParam(':username', $data['username']);
      $stmt->bindParam(':password', $hashedPassword);

      if ($stmt->execute()) {
        return json_encode(['success' => true]);
      } else {
        return json_encode(['error' => 'Failed to update profile']);
      }
    } catch (PDOException $e) {
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function getRequestCashByStatus($json)
  {
    include "connection.php";
    try {
      $data = json_decode($json, true);
      if (!$data || !isset($data['userId']) || !isset($data['status'])) {
        return json_encode(['error' => 'Invalid input data']);
      }
      $sql = "SELECT DISTINCT
                a.req_id,
                a.req_userId,
                a.req_purpose,
                a.req_desc,
                a.req_budget,
                a.req_cashMethodId,
                c.statusR_name,
                b.reqS_datetime
              FROM tblrequest a
              INNER JOIN tblrequeststatus b ON a.req_id = b.reqS_reqId
              INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
              WHERE a.req_userId = :userId
                AND c.statusR_name = :statusName
              ORDER BY a.req_datetime DESC";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':userId', $data['userId']);
      $stmt->bindParam(':statusName', $data['status']);
      $stmt->execute();
      $requestCash = $stmt->fetchAll(PDO::FETCH_ASSOC);
      return json_encode($requestCash);
    } catch (PDOException $e) {
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function cancelRequest($json) {
    include "connection.php";
    $data = json_decode($json, true);
    if (!isset($data['requestId']) || !isset($data['userId'])) {
      return json_encode(['error' => 'Request ID and User ID are required']);
    }
    try {
      // Check if the latest status is still Pending
      $sql = "SELECT c.statusR_name FROM tblrequeststatus b
              INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
              WHERE b.reqS_reqId = :requestId
              ORDER BY b.reqS_id DESC LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':requestId', $data['requestId']);
      $stmt->execute();
      $status = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$status || strtolower($status['statusR_name']) !== 'pending') {
        return json_encode(['error' => 'Only pending requests can be cancelled']);
      }
      // Get the statusR_id for Cancelled
      $statusSql = "SELECT statusR_id FROM tblstatusrequest WHERE statusR_name = 'Cancelled' LIMIT 1";
      $statusStmt = $conn->prepare($statusSql);
      $statusStmt->execute();
      $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);
      if (!$statusResult) {
        return json_encode(['error' => 'Cancelled status not found in status request table']);
      }
      $cancelledStatusId = $statusResult['statusR_id'];
      // Insert new status
      $insertSql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:requestId, :statusId, NOW())";
      $insertStmt = $conn->prepare($insertSql);
      $insertStmt->bindParam(':requestId', $data['requestId']);
      $insertStmt->bindParam(':statusId', $cancelledStatusId);
      if ($insertStmt->execute()) {
        return json_encode(['success' => true]);
      } else {
        return json_encode(['error' => 'Failed to cancel request']);
      }
    } catch (PDOException $e) {
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function editRequest($json) {
    include "connection.php";
    $data = json_decode($json, true);
    if (!isset($data['requestId']) || !isset($data['userId'])) {
      return json_encode(['error' => 'Request ID and User ID are required']);
    }
    try {
      // Check if the latest status is still Pending
      $sql = "SELECT c.statusR_name FROM tblrequeststatus b
              INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
              WHERE b.reqS_reqId = :requestId
              ORDER BY b.reqS_id DESC LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':requestId', $data['requestId']);
      $stmt->execute();
      $status = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$status || strtolower($status['statusR_name']) !== 'pending') {
        return json_encode(['error' => 'Only pending requests can be edited']);
      }
      // Update the request details
      $updateSql = "UPDATE tblrequest SET req_purpose = :purpose, req_desc = :desc, req_budget = :budget, req_cashMethodId = :cashMethodId WHERE req_id = :requestId AND req_userId = :userId";
      $updateStmt = $conn->prepare($updateSql);
      $updateStmt->bindParam(':purpose', $data['purpose']);
      $updateStmt->bindParam(':desc', $data['desc']);
      $updateStmt->bindParam(':budget', $data['budget']);
      $updateStmt->bindParam(':cashMethodId', $data['cashMethodId']);
      $updateStmt->bindParam(':requestId', $data['requestId']);
      $updateStmt->bindParam(':userId', $data['userId']);
      if ($updateStmt->execute()) {
        return json_encode(['success' => true]);
      } else {
        return json_encode(['error' => 'Failed to update request']);
      }
    } catch (PDOException $e) {
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }
}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$employee = new Employee();

switch ($operation) {
  case "addRequestCash":
    echo $employee->addRequestCash($json);
    break;
  case "CashMethod":
    echo $employee->CashMethod();
    break;
  case "statusRequest":
    echo $employee->statusRequest();
    break;
  case "getRequestCash":
    echo $employee->getRequestCash($json);
    break;
  case "getUserAvailableLimit":
    echo $employee->getUserAvailableLimit($json);
    break;
  case "getRequestStatusHistory":
    echo $employee->getRequestStatusHistory($json);
    break;
  case "getUserProfile":
    echo $employee->getUserProfile($json);
    break;
  case "editUserProfile":
    echo $employee->editUserProfile($json);
    break;
  case "getRequestCashByStatus":
    echo $employee->getRequestCashByStatus($json);
    break;
  case "cancelRequest":
    echo $employee->cancelRequest($json);
    break;
  case "editRequest":
    echo $employee->editRequest($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}