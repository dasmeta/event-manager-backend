import { Space, Button } from "antd";
import translations from "@/assets/translations";
import CalculateAction from "../CalculateAction";
import { IconBoard, IconFunctions, IconLogs } from "@/assets/icons";

export default ({
    options,
    refresh,
    showLoader
}) => {
    return (
        <Space size="small" wrap>
            <CalculateAction refresh={refresh} showLoader={showLoader} />
            <Button href={options.googleBoard} target="_blank" rel="noopener noreferrer" icon={<IconBoard />}>
                {translations.board}
            </Button>
            <Button
                icon={<IconFunctions />}
                href={`https://console.cloud.google.com/functions/list?project=${options.googleProjectId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {translations.functions}
            </Button>
            <Button
                icon={<IconLogs />}
                href={`https://console.cloud.google.com/logs/viewer?project=${
                    options.googleProjectId
                }&minLogLevel=0&expandAll=false&resource=cloud_function`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {translations.logs}
            </Button>
        </Space>
    );
}
