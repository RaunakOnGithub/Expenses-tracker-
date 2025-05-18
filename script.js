document.addEventListener("DOMContentLoaded", function () {
    // Common elements across pages
    const transactionList = document.getElementById("transactionList");
    const budgetList = document.getElementById("budgetList");
    const totalBalanceEl = document.getElementById("total-balance");
    const totalIncomeEl = document.getElementById("total-income");
    const totalExpensesEl = document.getElementById("total-expenses");

    // Load data from localStorage
    let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    let budgets = JSON.parse(localStorage.getItem("budgets")) || [];

    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme) {
        document.documentElement.classList.toggle("dark-mode", currentTheme === "dark");
        if (themeToggle) themeToggle.checked = currentTheme === "dark";
    }
    if (themeToggle) {
        themeToggle.addEventListener("change", function () {
            document.documentElement.classList.toggle("dark-mode");
            const theme = document.documentElement.classList.contains("dark-mode") ? "dark" : "light";
            localStorage.setItem("theme", theme);
            updateChartsForTheme(theme);
        });
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("active");
        });
    }

    // Transactions Page Functionality
    if (transactionList) {
        const descriptionInput = document.getElementById("description");
        const amountInput = document.getElementById("amount");
        const typeInput = document.getElementById("type");
        const categoryInput = document.getElementById("category");
        const transactionDateInput = document.getElementById("transactionDate");
        const descriptionError = document.getElementById("description-error");
        const amountError = document.getElementById("amount-error");

        function validateTransactionForm() {
            let isValid = true;
            descriptionError.textContent = "";
            amountError.textContent = "";

            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);

            if (description === "") {
                descriptionError.textContent = "Description is required.";
                isValid = false;
            }
            if (isNaN(amount) || amount <= 0) {
                amountError.textContent = "Please enter a valid amount.";
                isValid = false;
            }
            return isValid;
        }

        function updateTransactionUI(filteredTransactions = transactions) {
            transactionList.innerHTML = "";
            filteredTransactions.forEach((transaction, index) => {
                const transactionEl = document.createElement("div");
                transactionEl.classList.add("transaction-item", transaction.type);
                transactionEl.innerHTML = `
                    <p>${transaction.date} - <strong>${transaction.description}</strong> (${transaction.category})</p>
                    <p>${transaction.type === "income" ? "+" : "-"} ₹${transaction.amount.toFixed(2)}</p>
                    <button class="delete-btn" onclick="deleteTransaction(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                transactionList.appendChild(transactionEl);
            });

            // Update balance on index page
            if (totalBalanceEl) {
                let totalIncome = 0;
                let totalExpenses = 0;
                transactions.forEach((transaction) => {
                    if (transaction.type === "income") {
                        totalIncome += parseFloat(transaction.amount);
                    } else {
                        totalExpenses += parseFloat(transaction.amount);
                    }
                });
                let totalBalance = totalIncome - totalExpenses;
                totalBalanceEl.textContent = `₹${totalBalance.toFixed(2)}`;
                totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
                totalExpensesEl.textContent = `₹${totalExpenses.toFixed(2)}`;
                updateCharts(totalIncome, totalExpenses);
            }
        }

        window.handleAddTransaction = function () {
            if (!validateTransactionForm()) return;

            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const type = typeInput.value;
            const category = type === "expense" ? categoryInput.value : "N/A";
            const date = transactionDateInput.value || new Date().toISOString().split("T")[0];

            const transaction = { description, amount, type, category, date };
            transactions.push(transaction);
            localStorage.setItem("transactions", JSON.stringify(transactions));

            descriptionInput.value = "";
            amountInput.value = "";
            transactionDateInput.value = "";
            updateTransactionUI();
            filterTransactions();
        };

        window.deleteTransaction = function (index) {
            transactions.splice(index, 1);
            localStorage.setItem("transactions", JSON.stringify(transactions));
            updateTransactionUI();
            filterTransactions();
        };

        window.toggleCategory = function () {
            const categoryGroup = document.getElementById("categoryGroup");
            categoryGroup.style.display = typeInput.value === "expense" ? "block" : "none";
        };

        window.filterTransactions = function () {
            const filterType = document.getElementById("filter-type").value;
            let filteredTransactions = [...transactions];
            if (filterType !== "all") {
                filteredTransactions = transactions.filter((t) => t.type === filterType);
            }
            sortTransactions(filteredTransactions);
        };

        window.sortTransactions = function (filteredTransactions = transactions) {
            const sortBy = document.getElementById("sort-by").value;
            let sortedTransactions = [...filteredTransactions];

            if (sortBy === "date-desc") {
                sortedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (sortBy === "date-asc") {
                sortedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (sortBy === "amount-desc") {
                sortedTransactions.sort((a, b) => b.amount - a.amount);
            } else if (sortBy === "amount-asc") {
                sortedTransactions.sort((a, b) => a.amount - b.amount);
            } else if (sortBy === "category") {
                sortedTransactions.sort((a, b) => a.category.localeCompare(b.category));
            }

            updateTransactionUI(sortedTransactions);
        };

        window.clearTransactions = function () {
            if (confirm("Are you sure you want to clear all transactions?")) {
                transactions = [];
                localStorage.setItem("transactions", JSON.stringify(transactions));
                updateTransactionUI();
            }
        };

        // Chart.js for visual representation
        let balanceChart, categoryChart, trendChart;

        function updateCharts(income, expenses) {
            const balanceData = [income, expenses];

            if (balanceChart) balanceChart.destroy();
            balanceChart = new Chart(document.getElementById("balanceChart")?.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: ["Income", "Expenses"],
                    datasets: [{ data: balanceData, backgroundColor: ["#4CAF50", "#FF5733"] }],
                },
            });

            const categoryData = {};
            transactions.forEach((transaction) => {
                if (transaction.type === "expense") {
                    categoryData[transaction.category] = (categoryData[transaction.category] || 0) + transaction.amount;
                }
            });

            if (categoryChart) categoryChart.destroy();
            categoryChart = new Chart(document.getElementById("categoryChart")?.getContext("2d"), {
                type: "bar",
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{ label: "Expenses by Category", data: Object.values(categoryData), backgroundColor: "#3498db" }],
                },
            });

            const trendData = {};
            transactions.forEach((transaction) => {
                const month = new Date(transaction.date).toLocaleString("default", { month: "long" });
                trendData[month] = (trendData[month] || 0) + (transaction.type === "income" ? transaction.amount : -transaction.amount);
            });

            if (trendChart) trendChart.destroy();
            trendChart = new Chart(document.getElementById("trendChart")?.getContext("2d"), {
                type: "line",
                data: {
                    labels: Object.keys(trendData),
                    datasets: [{ label: "Spending Trends", data: Object.values(trendData), borderColor: "#FF5733", fill: false }],
                },
            });
        }

        function updateChartsForTheme(theme) {
            const textColor = theme === "dark" ? "#e0e0e0" : "#666";
            const gridColor = theme === "dark" ? "#444" : "#ddd";

            if (balanceChart) {
                balanceChart.options.plugins.legend.labels.color = textColor;
                balanceChart.update();
            }
            if (categoryChart) {
                categoryChart.options.scales.x.ticks.color = textColor;
                categoryChart.options.scales.y.ticks.color = textColor;
                categoryChart.options.scales.x.grid.color = gridColor;
                categoryChart.options.scales.y.grid.color = gridColor;
                categoryChart.update();
            }
            if (trendChart) {
                trendChart.options.scales.x.ticks.color = textColor;
                trendChart.options.scales.y.ticks.color = textColor;
                trendChart.options.scales.x.grid.color = gridColor;
                trendChart.options.scales.y.grid.color = gridColor;
                trendChart.update();
            }
        }

        // Initial load
        updateTransactionUI();
    }

    // Budget & Goals Page Functionality
    if (budgetList) {
        const budgetCategoryInput = document.getElementById("budget-category");
        const budgetAmountInput = document.getElementById("budget-amount");
        const goalAmountInput = document.getElementById("goal-amount");
        const budgetAmountError = document.getElementById("budget-amount-error");

        function validateBudgetForm() {
            let isValid = true;
            budgetAmountError.textContent = "";

            const budgetAmount = parseFloat(budgetAmountInput.value);

            if (isNaN(budgetAmount) || budgetAmount <= 0) {
                budgetAmountError.textContent = "Please enter a valid budget amount.";
                isValid = false;
            }
            return isValid;
        }

        function calculateSpent(category) {
            return transactions
                .filter((t) => t.type === "expense" && t.category === category)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        }

        function updateBudgetUI() {
            budgetList.innerHTML = "";
            budgets.forEach((budget, index) => {
                const spent = calculateSpent(budget.category);
                const percentage = (spent / budget.budgetAmount) * 100;
                const budgetEl = document.createElement("div");
                budgetEl.classList.add("budget-item");
                budgetEl.innerHTML = `
                    <div class="budget-details">
                        <p><strong>${budget.category}</strong></p>
                        <p>Budget: ₹${budget.budgetAmount.toFixed(2)}</p>
                        <p>Spent: ₹${spent.toFixed(2)}</p>
                        ${budget.goalAmount ? `<p>Goal: ₹${budget.goalAmount.toFixed(2)}</p>` : ""}
                        <div class="progress-bar">
                            <div class="progress" style="width: ${Math.min(percentage, 100)}%; background-color: ${percentage > 100 ? "#FF5733" : "#4CAF50"};"></div>
                        </div>
                        <p class="progress-text">${percentage.toFixed(1)}% of budget used</p>
                    </div>
                    <button class="delete-btn" onclick="deleteBudget(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                budgetList.appendChild(budgetEl);
            });
        }

        window.setBudget = function () {
            if (!validateBudgetForm()) return;

            const category = budgetCategoryInput.value;
            const budgetAmount = parseFloat(budgetAmountInput.value);
            const goalAmount = goalAmountInput.value ? parseFloat(goalAmountInput.value) : null;

            const budget = { category, budgetAmount, goalAmount };
            budgets.push(budget);
            localStorage.setItem("budgets", JSON.stringify(budgets));

            budgetAmountInput.value = "";
            goalAmountInput.value = "";
            updateBudgetUI();
        };

        window.deleteBudget = function (index) {
            budgets.splice(index, 1);
            localStorage.setItem("budgets", JSON.stringify(budgets));
            updateBudgetUI();
        };

        window.clearBudgets = function () {
            if (confirm("Are you sure you want to clear all budgets?")) {
                budgets = [];
                localStorage.setItem("budgets", JSON.stringify(budgets));
                updateBudgetUI();
            }
        };

        // Initial load
        updateBudgetUI();
    }
});