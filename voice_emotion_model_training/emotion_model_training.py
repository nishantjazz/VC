import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils.class_weight import compute_class_weight
import pickle

# -------------------------------
# CONFIG
# -------------------------------
CSV_PATH = "emotion.csv"
MODEL_SAVE_PATH = "emotion_model_improved.pth"
LABEL_ENCODER_PATH = "label_encoder.pkl"
SCALER_PATH = "scaler.pkl"
BATCH_SIZE = 128
EPOCHS = 200
LR = 0.00015
TEST_SIZE = 0.2
RANDOM_STATE = 42
PATIENCE = 10  # early stopping patience

# -------------------------------
# DEVICE & SEED
# -------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.manual_seed(RANDOM_STATE)
np.random.seed(RANDOM_STATE)
print(f"Using device: {device}")

# -------------------------------
# LOAD CSV
# -------------------------------
if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"❌ CSV file not found at path: {CSV_PATH}")

data = pd.read_csv(CSV_PATH)
print(f"Data shape: {data.shape}")
print(f"Columns: {data.columns}")

X = data.drop("Emotions", axis=1).values
y = data["Emotions"].values

# -------------------------------
# HANDLE NaN / Inf
# -------------------------------
X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

# -------------------------------
# NORMALIZE FEATURES
# -------------------------------
scaler = StandardScaler()
X = scaler.fit_transform(X)

# Save scaler for inference
with open(SCALER_PATH, "wb") as f:
    pickle.dump(scaler, f)
print(f"✅ Scaler saved to {SCALER_PATH}")

# -------------------------------
# LABEL ENCODING
# -------------------------------
if os.path.exists(LABEL_ENCODER_PATH):
    with open(LABEL_ENCODER_PATH, "rb") as f:
        le = pickle.load(f)
else:
    le = LabelEncoder()
    le.fit(y)
    with open(LABEL_ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

y_encoded = le.transform(y)
y_tensor = torch.tensor(y_encoded, dtype=torch.long)
X_tensor = torch.tensor(X, dtype=torch.float32)

# -------------------------------
# TRAIN-TEST SPLIT
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_tensor, y_tensor, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_tensor
)

# -------------------------------
# DATASET & DATALOADER
# -------------------------------
class EmotionDataset(Dataset):
    def __init__(self, X, y):
        self.X = X
        self.y = y
    def __len__(self):
        return len(self.X)
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_dataset = EmotionDataset(X_train, y_train)
test_dataset = EmotionDataset(X_test, y_test)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

# -------------------------------
# MODEL
# -------------------------------
input_dim = X_train.shape[1]
output_dim = len(le.classes_)

model = nn.Sequential(
    nn.Linear(input_dim, 256),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(128, 64),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(64, output_dim)
).to(device)

# -------------------------------
# CLASS WEIGHTS
# -------------------------------
class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(y_encoded),
    y=y_encoded
)
class_weights = torch.tensor(class_weights, dtype=torch.float32).to(device)

criterion = nn.CrossEntropyLoss(weight=class_weights)
optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=3, verbose=True)

# -------------------------------
# TRAINING LOOP (with Early Stopping)
# -------------------------------
best_val_loss = float("inf")
no_improve_epochs = 0

for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0

    for inputs, labels in train_loader:
        inputs, labels = inputs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        running_loss += loss.item()

    avg_train_loss = running_loss / len(train_loader)

    # -------------------------------
    # VALIDATION
    # -------------------------------
    model.eval()
    val_loss = 0.0
    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            val_loss += loss.item()

    avg_val_loss = val_loss / len(test_loader)
    scheduler.step(avg_val_loss)

    print(f"Epoch [{epoch+1}/{EPOCHS}] | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

    # Save best model
    if avg_val_loss < best_val_loss:
        best_val_loss = avg_val_loss
        no_improve_epochs = 0
        torch.save(model.state_dict(), MODEL_SAVE_PATH)
    else:
        no_improve_epochs += 1
        if no_improve_epochs >= PATIENCE:
            print(f"⏹️ Early stopping triggered at epoch {epoch+1}")
            break

# -------------------------------
# EVALUATION
# -------------------------------
print("\n🔍 Evaluating best saved model...")
model.load_state_dict(torch.load(MODEL_SAVE_PATH))
model.eval()

all_preds, all_labels = [], []

with torch.no_grad():
    for inputs, labels in test_loader:
        inputs, labels = inputs.to(device), labels.to(device)
        outputs = model(inputs)
        preds = torch.argmax(outputs, dim=1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

acc = accuracy_score(all_labels, all_preds)
print(f"\n✅ Test Accuracy: {acc*100:.2f}%")
print("\nClassification Report:")
print(classification_report(all_labels, all_preds, target_names=le.classes_))

print(f"\n✅ Best model saved to {MODEL_SAVE_PATH}")
