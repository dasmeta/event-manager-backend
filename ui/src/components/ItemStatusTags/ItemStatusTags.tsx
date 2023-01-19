import { Tag } from "antd";
import { isAnomaly, isError, isFail, isMissing, isSuccess } from "@/utils/checker";
import translations from "@/assets/translations";

const ItemStatusTags = ({ item }: any) => {
    const status = [];
    if (isError(item)) {
        status.push(<Tag color="#f50">{translations.error}</Tag>);
    }
    if (isFail(item)) {
        status.push(<Tag color="#f50">{translations.fail}</Tag>);
    }
    if (isMissing(item)) {
        status.push(<Tag color="volcano">{translations.missing}</Tag>);
    }
    if (isAnomaly(item)) {
        status.push(<Tag color="red">{translations.anomaly}</Tag>);
    }
    if (isSuccess(item)) {
        status.push(<Tag color="green">{translations.success}</Tag>);
    }

    return status;
};

export default ItemStatusTags;