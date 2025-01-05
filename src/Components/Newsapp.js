import React, { useEffect, useState } from "react";
import Card from "./Card";
import { useAuth0 } from "@auth0/auth0-react";
import Papa from "papaparse"; // CSV export library
import { jsPDF } from "jspdf"; // PDF export library

const Newsapp = () => {
  const { loginWithRedirect, isAuthenticated, logout } = useAuth0();
  const [search, setSearch] = useState("india");
  const [newsData, setNewsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    author: "",
    dateFrom: "",
    dateTo: "",
    type: "",
  });

  // Payout states
  const [payoutPerArticle, setPayoutPerArticle] = useState(
    JSON.parse(localStorage.getItem("payoutPerArticle")) || 0
  );
  const [totalPayout, setTotalPayout] = useState(
    JSON.parse(localStorage.getItem("totalPayout")) || 0
  );

  const API_KEY = "44f5f19110e74f0e9d994f18f26afe82";

  // Fetch news data from API
  const getData = async () => {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${search}&apiKey=${API_KEY}`
    );
    const jsonData = await response.json();
    const articles = jsonData.articles.slice(0, 10);
    setNewsData(articles);
    setFilteredData(articles); // Initially, filtered data is the same as fetched data
  };

  useEffect(() => {
    getData();
  }, [search]); // Fetch data when search changes

  // Calculate total payout whenever newsData or payoutPerArticle changes
  useEffect(() => {
    if (newsData.length && payoutPerArticle > 0) {
      const total = newsData.length * payoutPerArticle;
      setTotalPayout(total);
      localStorage.setItem("totalPayout", JSON.stringify(total));
    }
  }, [newsData, payoutPerArticle]);

  // Apply filters to the news data
  useEffect(() => {
    if (newsData.length) {
      const filtered = newsData.filter((article) => {
        const matchesAuthor = filters.author
          ? article.author?.toLowerCase().includes(filters.author.toLowerCase())
          : true;
        const matchesType = filters.type
          ? article.type === filters.type
          : true;
        const matchesDate =
          (!filters.dateFrom ||
            new Date(article.publishedAt) >= new Date(filters.dateFrom)) &&
          (!filters.dateTo ||
            new Date(article.publishedAt) <= new Date(filters.dateTo));

        return matchesAuthor && matchesType && matchesDate;
      });
      setFilteredData(filtered);
    }
  }, [filters, newsData]); // Update filteredData when filters or newsData change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleGlobalSearch = () => getData();

  const handlePayoutChange = (e) => {
    const value = e.target.value;
    setPayoutPerArticle(value);
    localStorage.setItem("payoutPerArticle", JSON.stringify(value));
  };

  const exportToCSV = () => {
    const data = newsData.map((article) => ({
      title: article.title,
      author: article.author,
      publishedAt: article.publishedAt,
      description: article.description,
      payout: payoutPerArticle,
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "payout_report.csv";
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payout Report", 20, 20);

    let yPosition = 30;
    newsData.forEach((article, index) => {
      doc.setFontSize(12);
      doc.text(
        `${index + 1}. ${article.title} - Payout: $${payoutPerArticle}`,
        20,
        yPosition
      );
      yPosition += 10;
    });

    doc.save("payout_report.pdf");
  };

  const exportToGoogleSheets = () => {
    const data = newsData.map((article) => [
      article.title,
      article.author,
      article.publishedAt,
      article.description,
      payoutPerArticle,
    ]);

    const csvData = data.map((row) => row.join(",")).join("\n");
    const base64Data = btoa(csvData);
    const url = `https://docs.google.com/spreadsheets/d/1tK6JqRE3j3cRAg9C1o7pF6HVbL-4Jr_hOmbZdc5bgnP8/edit?usp=sharing&data=${base64Data}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      <nav>
        <h1>Trendy News</h1>
        <ul style={{ display: "flex", gap: "11px" }}>
          <a style={{ fontWeight: 600, fontSize: "17px" }}>All News</a>
          <a style={{ fontWeight: 600, fontSize: "17px" }}>Trending</a>
        </ul>
        <div className="searchBar">
          <input
            type="text"
            placeholder="Search News"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={handleGlobalSearch}>Search</button>
        </div>
        {isAuthenticated ? (
          <button onClick={() => logout({ returnTo: window.location.origin })}>
            Log Out
          </button>
        ) : (
          <button onClick={() => loginWithRedirect()}>Login</button>
        )}
      </nav>

      <div className="exportButtons">
        <button onClick={exportToCSV}>Export to CSV</button>
        <button onClick={exportToPDF}>Export to PDF</button>
        <button onClick={exportToGoogleSheets}>Export to Google Sheets</button>
      </div>

      <div className="filtersAndPayout" style={{ display: "flex", gap: "20px" }}>
        <div className="filters" style={{ flex: 2 }}>
          <h3>Filters</h3>
          <div>
            <label>Author: </label>
            <input
              type="text"
              name="author"
              value={filters.author}
              onChange={handleFilterChange}
              placeholder="Filter by author"
            />
          </div>
          <div>
            <label>From: </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
            <label>To: </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label>Type: </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              <option value="news">News</option>
              <option value="blogs">Blogs</option>
            </select>
          </div>
        </div>

        <div className="payoutCalculator" style={{ flex: 1 }}>
          <h3>Payout Calculator</h3>
          <label>Set Payout per Article/Blog: </label>
          <input
            type="number"
            value={payoutPerArticle}
            onChange={handlePayoutChange}
            min="0"
          />
          <div>Total Payout: ${totalPayout}</div>
        </div>
      </div>

      <div className="categoryBtn">
        <button onClick={() => setSearch("sports")}>Sports</button>
        <button onClick={() => setSearch("politics")}>Politics</button>
        <button onClick={() => setSearch("entertainment")}>Entertainment</button>
        <button onClick={() => setSearch("health")}>Health</button>
        <button onClick={() => setSearch("fitness")}>Fitness</button>
      </div>

      <div>
        {filteredData ? <Card data={filteredData} /> : <p>Loading...</p>}
      </div>

      {/* Footer section */}
      <footer style={{ backgroundColor: "#333", color: "#fff", padding: "20px 0" }}>
        <div style={{ textAlign: "center" }}>
          <h3>Trendy News</h3>
          <p>Stay updated with the latest news from all around the world.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f" style={{ color: "#fff", fontSize: "20px" }}></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-twitter" style={{ color: "#fff", fontSize: "20px" }}></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram" style={{ color: "#fff", fontSize: "20px" }}></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-linkedin-in" style={{ color: "#fff", fontSize: "20px" }}></i>
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} Trendy News. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Newsapp;
