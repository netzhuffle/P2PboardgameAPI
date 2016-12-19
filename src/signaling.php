<?php

$db = new PDO('sqlite:messages.db');

$minimumTime = time() - 10;

if (isset($_POST['message']) && $_POST['message']) {
    $time = time();
    $statement = $db->prepare("INSERT INTO messages (message, timestamp) VALUES (:message, $time)");
    $statement->execute([':message' => $_POST['message']]);
    $db->query("DELETE FROM messages WHERE timestamp < $minimumTime");
}

$statement = $db->query("SELECT id, message, timestamp FROM messages WHERE timestamp > $minimumTime ORDER BY timestamp");
$message = $statement->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($message);
