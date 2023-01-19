import { Divider } from "antd";
import { UnorderedListOutlined, CoffeeOutlined, LineChartOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";

export default ({
    options,
}) => {
    return (
        <>
            <a href={options.googleBoard} target="_blank" rel="noopener noreferrer">
                <LineChartOutlined /> {translations.board}
            </a>
            <Divider type="vertical" />
            <a
                href={`https://console.cloud.google.com/functions/list?project=${options.googleProjectId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <CoffeeOutlined /> {translations.functions}
            </a>
            <Divider type="vertical" />
            <a
                href={`https://console.cloud.google.com/logs/viewer?project=${
                    options.googleProjectId
                }&minLogLevel=0&expandAll=false&resource=cloud_function`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <UnorderedListOutlined /> {translations.logs}
            </a>
        </>
    );
}