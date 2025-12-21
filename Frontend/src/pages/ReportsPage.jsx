import { useMemo, useState, useEffect } from 'react';
import { Search, Bell, Download, RefreshCcw, ArrowUpRight } from 'lucide-react';
import '../Styles/ReportsPage.css';

function KpiCard({ tone = 'plain', title, value, subLeft, subRight, right }) {
  return (
    <div className={`rpCard rpKpi rpKpi--${tone}`}>
      <div className="rpKpiTop">
        <div className="rpKpiTitle">{title}</div>
        <div className="rpKpiBadge">{right}</div>
      </div>
      <div className="rpKpiValue">{value}</div>
      <div className="rpKpiSub">
        <span>{subLeft}</span>
        <span className="rpDot" />
        <span>{subRight}</span>
      </div>
    </div>
  );
}

function TableCard({ title, right, children }) {
  return (
    <div className="rpCard">
      <div className="rpCardHead">
        <div className="rpCardTitle">{title}</div>
        <div className="rpCardRight">{right}</div>
      </div>
      <div className="rpCardBody">{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const topCustomers = useMemo(
    () => [
      { rank: 1, name: 'Ahmed Sameh', spent: 385, orders: 2 },
      { rank: 2, name: 'Samir Ali', spent: 230, orders: 1 },
      { rank: 3, name: 'Yasmeen Khalid', spent: 120, orders: 1 },
      { rank: 4, name: 'Sara Amin', spent: 90, orders: 1 },
      { rank: 5, name: 'Khaled Hussein', spent: 75, orders: 1 },
    ],
    []
  );

  const topBooks = useMemo(
    () => [
      { label: 'Cosmos', value: 45 },
      { label: 'Sapiens', value: 32 },
      { label: '1984', value: 28 },
      { label: 'Others', value: 55 },
    ],
    []
  );

  const top10Books = useMemo(
    () => [
      { rank: 1, title: 'Cosmos', units: 50, revenue: 11500 },
      { rank: 2, title: 'Sapiens', units: 45, revenue: 9800 },
      { rank: 3, title: '1984', units: 39, revenue: 9000 },
      { rank: 4, title: 'The Art Book', units: 29, revenue: 8500 },
      { rank: 5, title: 'Guns, Germs, and Steel', units: 29, revenue: 7500 },
      { rank: 6, title: 'The Silk Roads', units: 24, revenue: 6900 },
      { rank: 7, title: 'Meditations', units: 20, revenue: 5600 },
      { rank: 8, title: 'A Brief History of Time', units: 19, revenue: 5400 },
      { rank: 9, title: 'The Alchemist', units: 18, revenue: 5100 },
      { rank: 10, title: 'Prisoners of Geography', units: 16, revenue: 4600 },
    ],
    []
  );

  const [openTop10, setOpenTop10] = useState(false);

  const [day, setDay] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [isbnQuery, setIsbnQuery] = useState('');
  const [ordersCount, setOrdersCount] = useState(5);

  // ✅ Previous-month report state
  const [prevMonth, setPrevMonth] = useState({
    loading: true,
    total_sales: 0,
    orders_count: 0,
    items_sold: 0,
    error: null,
  });

  // donut percent values
  const total = topBooks.reduce((s, x) => s + x.value, 0);
  const p = topBooks.map((x) => Math.round((x.value / total) * 100));

  function runSalesByDay() {
    alert(`Run Sales By Day for ${day} (mock)`);
  }

  function runBookOrdersCount() {
    if (!isbnQuery.trim()) return;
    setOrdersCount((prev) => (prev % 9) + 1);
  }

  // ✅ Fetch previous-month report (used on load + refresh)
  async function loadPreviousMonth() {
    try {
      setPrevMonth((p) => ({ ...p, loading: true, error: null }));

      // If you already use a proxy, you can change this to:
      // '/api/admin/reports/sales/previous-month'
      const res = await fetch(
        'http://localhost:3000/api/admin/reports/sales/previous-month'
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load previous month report');
      }

      setPrevMonth({
        loading: false,
        total_sales: Number(data.total_sales ?? 0),
        orders_count: Number(data.orders_count ?? 0),
        items_sold: Number(data.items_sold ?? 0),
        error: null,
      });
    } catch (e) {
      setPrevMonth((p) => ({
        ...p,
        loading: false,
        error: e.message || 'Unknown error',
      }));
    }
  }

  useEffect(() => {
    loadPreviousMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rpShell">
      <main className="rpMain">
        {/* Header */}
        <div className="rpHeader">
          <div>
            <div className="rpTitle">Reports</div>
            <div className="rpSubtitle">Sales & Insights</div>
          </div>

          <div className="rpHeaderRight">
            <div className="rpIconGroup">
              <button className="rpIconBtn" type="button">
                <Search size={18} />
              </button>
              <button className="rpIconBtn" type="button">
                <Bell size={18} />
              </button>
            </div>

            <button className="rpBtn rpBtnGhost" type="button">
              <Download size={18} />
              Export CSV
            </button>

            {/* ✅ Refresh now triggers API reload */}
            <button
              className="rpBtn rpBtnPrimary"
              type="button"
              onClick={loadPreviousMonth}
              disabled={prevMonth.loading}
              title={prevMonth.loading ? 'Loading...' : 'Refresh'}
            >
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="rpGrid">
          {/* KPI grid */}
          <div className="rpKpis">
            {/* ✅ Previous month KPI now uses API data */}
            <KpiCard
              tone="accent"
              title="Previous Month Sales"
              value={
                prevMonth.loading
                  ? 'Loading...'
                  : `$${prevMonth.total_sales.toFixed(2)}`
              }
              subLeft={
                prevMonth.loading
                  ? '— orders'
                  : `${prevMonth.orders_count} orders`
              }
              subRight={
                prevMonth.loading
                  ? '— items sold'
                  : `${prevMonth.items_sold} items sold`
              }
              right={prevMonth.error ? 'Error' : '+2.08%'}
            />

            <div className="rpCard rpKpi">
              <div className="rpKpiTop">
                <div className="rpKpiTitle">Sales By Day</div>
                <div className="rpKpiBadge rpKpiBadge--good">+12.4%</div>
              </div>

              <div className="rpKpiRow">
                <div className="rpKpiValue">$230.00</div>
                <button
                  className="rpBtn rpBtnPrimary rpBtnWide"
                  onClick={runSalesByDay}
                >
                  Run Report <ArrowUpRight size={18} />
                </button>
              </div>

              <div className="rpKpiSub rpKpiSubRow">
                <input
                  className="rpInput"
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
                <div className="rpKpiMini">
                  <span>1 orders</span>
                  <span className="rpDot" />
                  <span>6 items sold</span>
                </div>
              </div>
            </div>

            <KpiCard
              tone="plain"
              title="Top Customer (3 months)"
              value="$385.00"
              subLeft="Ahmed Sameh"
              subRight="2 orders"
              right="+5.2%"
            />

            <KpiCard
              tone="plain"
              title="Top Book (3 months)"
              value="50 units"
              subLeft="Cosmos"
              subRight="$11,500 revenue"
              right="+3.9%"
            />
          </div>

          {/* Donut / Product statistics */}
          <div className="rpCard rpSide">
            <div className="rpCardHead">
              <div>
                <div className="rpCardTitle">Product Statistic</div>
                <div className="rpHint">Top selling books (last 3 months)</div>
              </div>

              <select className="rpSelect">
                <option>Today</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </div>

            <div className="rpDonutWrap">
              <div
                className="rpDonut"
                style={{
                  background: `conic-gradient(
                    var(--rpBlue) 0 ${p[0]}%,
                    var(--rpIndigo) ${p[0]}% ${p[0] + p[1]}%,
                    var(--rpViolet) ${p[0] + p[1]}% ${p[0] + p[1] + p[2]}%,
                    #e8ecff ${p[0] + p[1] + p[2]}% 100%
                  )`,
                }}
              >
                <div className="rpDonutCenter">
                  <div className="rpDonutNum">10</div>
                  <div className="rpDonutLabel">Top Books</div>
                </div>
              </div>

              <div className="rpLegend">
                {topBooks.slice(0, 3).map((x) => (
                  <div key={x.label} className="rpLegendRow">
                    <div className="rpLegendName">{x.label}</div>
                    <div className="rpLegendVal">{x.value}</div>
                  </div>
                ))}

                <button
                  type="button"
                  className="rpLegendRow rpLegendRowMuted rpLegendBtn"
                  onClick={() => setOpenTop10(true)}
                >
                  <span className="rpLegendName">Others</span>
                  <span className="rpLegendVal">{topBooks[3].value}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom left: Top Customers table */}
          <TableCard
            title="Top 5 Customers"
            right={
              <div className="rpPills">
                <button className="rpPill rpPillActive" type="button">
                  This year
                </button>
                <button className="rpPill" type="button">
                  Last 3 months
                </button>
              </div>
            }
          >
            <table className="rpTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer</th>
                  <th>Total Spent</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.rank}>
                    <td className="rpTdRank">{c.rank}</td>
                    <td>
                      <div className="rpPerson">
                        <div className="rpMiniAvatar">
                          {c.name
                            .split(' ')
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="rpPersonName">{c.name}</div>
                      </div>
                    </td>
                    <td>${c.spent.toFixed(2)}</td>
                    <td>{c.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          {/* Bottom right: Book Orders Count lookup */}
          <div className="rpCard rpGrowth">
            <div className="rpCardHead">
              <div>
                <div className="rpCardTitle">Book Orders Count</div>
                <div className="rpHint">How many times a book was ordered</div>
              </div>
            </div>

            <div className="rpLookup">
              <input
                className="rpInput"
                placeholder="Search by ISBN or title..."
                value={isbnQuery}
                onChange={(e) => setIsbnQuery(e.target.value)}
              />
              <button
                className="rpBtn rpBtnPrimary rpBtnWide"
                onClick={runBookOrdersCount}
              >
                Run <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="rpBigStat">
              <div className="rpBigNum">{ordersCount}</div>
              <div>
                <div className="rpBigTitle">Times Ordered</div>
                <div className="rpHint">Last ordered • Apr 22 (mock)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Top 10 Books */}
        {openTop10 && (
          <div className="rpModalBackdrop" onClick={() => setOpenTop10(false)}>
            <div className="rpModal" onClick={(e) => e.stopPropagation()}>
              <div className="rpModalHead">
                <div>
                  <div className="rpModalTitle">Top 10 Selling Books</div>
                  <div className="rpHint">Last 3 months (mock)</div>
                </div>

                <button
                  type="button"
                  className="rpModalClose"
                  onClick={() => setOpenTop10(false)}
                >
                  ✕
                </button>
              </div>

              <div className="rpModalBody">
                <table className="rpTable">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Book</th>
                      <th>Units</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Books.map((b) => (
                      <tr key={b.rank}>
                        <td className="rpTdRank">{b.rank}</td>
                        <td>{b.title}</td>
                        <td>{b.units}</td>
                        <td>${b.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
