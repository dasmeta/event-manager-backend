import { Space, Button } from "antd";
import { UnorderedListOutlined, CoffeeOutlined, LineChartOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import CalculateAction from "../CalculateAction";

export default ({
    options,
    refresh
}) => {
    return (
        <Space size="small" wrap>
            <CalculateAction refresh={refresh} />
            <Button href={options.googleBoard} target="_blank" rel="noopener noreferrer">
                <LineChartOutlined /> {translations.board}
            </Button>
            <Button
                href={`https://console.cloud.google.com/functions/list?project=${options.googleProjectId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <CoffeeOutlined /> {translations.functions}
            </Button>
            <Button
                href={`https://console.cloud.google.com/logs/viewer?project=${
                    options.googleProjectId
                }&minLogLevel=0&expandAll=false&resource=cloud_function`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <UnorderedListOutlined /> {translations.logs}
            </Button>
        </Space>
    );
}