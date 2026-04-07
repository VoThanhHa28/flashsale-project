# QUY ƯỚC KHI VIẾT CODE

### 1️⃣ **Separation of Concerns (SoC)**

👉 **Tách trách nhiệm rõ ràng**

- UI ≠ business logic
- Validation ≠ API call
- Controller ≠ Service ≠ Repository

> ❌ Một file làm tất cả
> 
> 
> ✅ Mỗi phần làm đúng việc của nó
> 

---

### 2️⃣ **Readability**

👉 Code **dễ đọc hơn là dễ viết**

- Tên biến rõ nghĩa
- Hàm ngắn
- Ít nested
- Đọc 1 lượt là hiểu logic

> “Code is read more often than it is written.”
> 

---

### 3️⃣ **Maintainability**

👉 **Dễ sửa – dễ mở rộng**

- Thêm rule mới không đập code cũ
- Fix bug không lan chỗ khác

---

### 4️⃣ **Single Responsibility Principle (SRP)**

👉 **1 function / class chỉ có 1 lý do để thay đổi**

```jsx
❌validateAndSaveAndNotify()
✅validate()
✅save()
✅notify()
```

---

### 5️⃣ **Reusability**

👉 Code dùng lại được

- Validation dùng chung
- Helper không gắn chặt UI

---

### 6️⃣ **Consistency**

👉 **Viết code nhất quán**

- Cùng 1 style đặt tên
- Cùng pattern xử lý lỗi
- Cùng format

> Consistency > cleverness
> 

---

### 7️⃣ **Scalability**

👉 Code chịu được việc **phát triển lớn lên**

- Thêm feature không rewrite
- Tách module dễ

---

### 8️⃣ **Testability**

👉 Code **dễ test**

- Ít phụ thuộc lẫn nhau
- Có thể unit test từng phần

---

### 9️⃣ **Clarity**

👉 Rõ ràng hơn là “thông minh”

- Tránh magic number
- Tránh hack

---

### 🔟 **DRY (Don’t Repeat Yourself)**

👉 Không copy-paste logic

---

### 1️⃣1️⃣ **KISS (Keep It Simple, Stupid)**

👉 Đơn giản nhất có thể

---

### 1️⃣2️⃣ **Explicit over Implicit**

👉 Viết **rõ ràng** hơn là ẩn ý

```jsx
❌handle()
✅validateProductInput()
```

---

## 📌 Câu “chốt hạ” rất hay để nói trong review

Bạn có thể dùng nguyên câu này 👇

> “Code cần **separate responsibility, readable, maintainable, consistent và dễ mở rộng**.”
>