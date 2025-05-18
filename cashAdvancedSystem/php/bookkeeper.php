<?php
include "headers.php";

class Bookkeeper {
  function getRequestCash()
  {
      include "connection.php";

      try {
          // This query fetches only the latest reqS_id (status) for each reqS_reqId (request)
          $sql = "SELECT 
                      a.req_id, 
                      a.req_userId, 
                      a.req_purpose, 
                      a.req_desc,
                      a.req_budget, 
                      a.req_cashMethodId,
                      c.statusR_name,
                      b.reqS_datetime,
                      d.user_firstname,
                      d.user_lastname
                  FROM tblrequest a
                  INNER JOIN (
                      SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                      FROM tblrequeststatus
                      GROUP BY reqS_reqId
                  ) latest_status ON a.req_id = latest_status.reqS_reqId
                  INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
                  INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                  INNER JOIN tbluser d ON a.req_userId = d.user_id
                  ORDER BY a.req_datetime DESC";

          $stmt = $conn->prepare($sql);
          $stmt->execute();
          
          return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

      } catch (PDOException $e) {
          error_log("Database error in getRequestCash: " . $e->getMessage());
          return json_encode([]);
      }
  }

  function completeRequest($json) {
    include "connection.php";
    $json = json_decode($json, true);
    try {
        $completedStatusId = 18; // adjust to your actual statusR_id for 'Completed'
        $sql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_userId, reqS_statusId, reqS_datetime) VALUES (:reqId, :userId, :statusId, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':reqId', $json['req_id']);
        $stmt->bindParam(':userId', $json['user_id']);
        $stmt->bindParam(':statusId', $completedStatusId);
        if ($stmt->execute()) {
            return json_encode(['success' => true]);
        } else {
            return json_encode(['error' => 'Failed to complete request']);
        }
    } catch (PDOException $e) {
        error_log("Database error in completeRequest: " . $e->getMessage());
        return json_encode(['error' => 'Database error occurred']);
    }
  }
  function getApprovedRequests() {
    include "connection.php";

    try {
        $approvedStatusId = 19; // 'approved'
        $sql = "SELECT 
                    a.req_id, 
                    a.req_userId, 
                    a.req_purpose, 
                    a.req_desc,
                    a.req_budget, 
                    a.req_cashMethodId,
                    c.statusR_name,
                    b.reqS_datetime,
                    d.user_firstname,
                    d.user_lastname
                FROM tblrequest a
                INNER JOIN tblrequeststatus b ON a.req_id = b.reqS_reqId
                INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                INNER JOIN tbluser d ON a.req_userId = d.user_id
                WHERE c.statusR_id = :approvedStatusId
                ORDER BY a.req_datetime DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':approvedStatusId', $approvedStatusId);
        $stmt->execute();
        
        return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

    } catch (PDOException $e) {
        error_log("Database error in getApprovedRequests: " . $e->getMessage());
        return json_encode([]);
    }
  }

  function getTotalBudgeted() {
    include "connection.php";
    $sql = "SELECT SUM(user_availableLimit) as total_budgeted FROM tbluser";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode(['total_budgeted' => floatval($result['total_budgeted'] ?? 0)]);
  }

  function getUsedMoney() {
    include "connection.php";
    $completedStatusId = 18; // adjust to your actual statusR_id for 'Completed'
    $sql = "SELECT SUM(a.req_budget) as used_money
            FROM tblrequest a
            INNER JOIN (
                SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                FROM tblrequeststatus
                GROUP BY reqS_reqId
            ) latest_status ON a.req_id = latest_status.reqS_reqId
            INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
            WHERE b.reqS_statusId = :completedStatusId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':completedStatusId', $completedStatusId);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode(['used_money' => floatval($result['used_money'] ?? 0)]);
  }

  function getCompletedStats() {
    include "connection.php";
    $completedStatusId = 18; // statusR_id for 'Completed'
    $sql = "SELECT COUNT(DISTINCT reqS_reqId) as completed_count, SUM(a.req_budget) as total_advanced
            FROM tblrequeststatus b
            INNER JOIN tblrequest a ON a.req_id = b.reqS_reqId
            WHERE b.reqS_statusId = :completedStatusId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':completedStatusId', $completedStatusId);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return json_encode([
      'completed_count' => intval($result['completed_count'] ?? 0),
      'total_advanced' => floatval($result['total_advanced'] ?? 0)
    ]);
  }
  
  function getTransactionHistory() {
    include "connection.php";
    $sql = "SELECT a.reqS_datetime, e.user_firstname AS bookkeeper_firstname, e.user_lastname AS bookkeeper_lastname, c.statusR_name, d.req_budget, d.req_purpose, d.req_desc, b.user_firstname AS employee_firstname, b.user_lastname AS employee_lastname, f.cashM_name
            FROM tblrequeststatus a
            INNER JOIN tbluser e ON a.reqS_userId = e.user_id
            INNER JOIN tblrequest d ON a.reqS_reqId = d.req_id
            INNER JOIN tbluser b ON d.req_userId = b.user_id
            INNER JOIN tblstatusrequest c ON a.reqS_statusId = c.statusR_id
            INNER JOIN tblcashmethod f ON d.req_cashMethodId = f.cashM_id
            WHERE a.reqS_statusId = 18
            ORDER BY a.reqS_datetime DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
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
        return json_encode(['incorrectPassword' => 'Current password is incorrect']);
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

}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$bookkeeper = new Bookkeeper();

switch ($operation) {
  case "getRequestCash":
    echo $bookkeeper->getRequestCash();
    break;
  case "completeRequest":
    echo $bookkeeper->completeRequest($json);
    break;
  case "getApprovedRequests":
    echo $bookkeeper->getApprovedRequests();
    break;
  case "getTotalBudgeted":
    echo $bookkeeper->getTotalBudgeted();
    break;
  case "getUsedMoney":
    echo $bookkeeper->getUsedMoney();
    break;
  case "getCompletedStats":
    echo $bookkeeper->getCompletedStats();
    break;
  case "getTransactionHistory":
    echo $bookkeeper->getTransactionHistory();
    break;
  case "getUserProfile":
    echo $bookkeeper->getUserProfile($json);
    break;
  case "editUserProfile":
    echo $bookkeeper->editUserProfile($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}