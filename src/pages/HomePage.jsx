import PortfolioSummary from '../components/PortfolioSummary';
import AddHoldingForm from '../components/AddHoldingForm';
import AllocationChart from '../components/AllocationChart';

function HomePage({portfolio, fetchPortfolio}) {
    return (
        <div>
          <h1>我的持仓</h1>
          <PortfolioSummary portfolio={portfolio} onHoldingDeleted={fetchPortfolio} />
          {/* 
          你像使用HTML标签一样使用这个组件，portfolio={portfolio}是把资料传进去——
          左边portfolio是这个组件定义时取的参数名字，右边{portfolio}是App.jsx自己state里的那个变量。
          这就是props：父层组件（App）把资料"传下去"给子层组件（PortfolioSummary）用。
          */}
          <AddHoldingForm onHoldingAdded={fetchPortfolio} />
          <AllocationChart holdings={portfolio.holdings} />
        </div>
      );
      // return (...)里面那段看起来像HTML的东西叫JSX，是React特有的写法，
      // 让你可以直接在JavaScript里写"画面长什么样子"，背后其实会被编译成真正的JavaScript操作。
    }

export default HomePage;