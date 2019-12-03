import React, { Component,Fragment } from 'react';
import { connect } from 'react-redux';
import { tu } from '../../utils/i18n';
import { Modal, Form, Input, Select } from 'antd';
import PropTypes from 'prop-types';
import { CURRENCYTYPE, FEELIMIT, TRXDEPOSITMIN, TRCDEPOSITMIN, ONE_TRX } from './../../constants';
import SweetAlert from 'react-bootstrap-sweetalert';
import { mul, division } from './../../utils/calculation';
import rebuildList from "./../../utils/rebuildList";
import { NameWithId } from '../common/names';
import { AddressLink } from "../common/Links";
import {TRXPrice} from "../common/Price";
import {FormattedDate, FormattedNumber, FormattedRelative, FormattedTime, injectIntl} from "react-intl";
import {Client, tronWeb} from "../../services/api";
import Utils from '../../utils/contractUtils';

const { Option } = Select;

class SignDetailsModal extends Component {

    static propTypes = {
        option: PropTypes.object,
        sideChains: PropTypes.array,
        account: PropTypes.object,
        type: PropTypes.string,
        fees: PropTypes.object,
    };

    constructor() {
        super();
        this.state = {
            isDisabled: false,
            isShowModal: true,
        };
    }
    componentDidMount() {
        const { details } = this.props;
        if(details.contractType == 'TriggerSmartContract' && details.functionSelector) {
            this.getParameterValue()
        }
    }


    /**
     * clsoe result
     */
    hideModal = () => {
        this.setState({
            modal: null,
        });
        this.cancel();
    };

    /**
     * Form confirm
     */
    confirm = () => {
        const { form: { validateFields }, account: { sunWeb },
            option: { id, address, precision, type }, fees: { depositFee } } = this.props;
        const { numValue, errorMess } = this.state;
        this.setState({ isDisabled: true });
        validateFields(async(err, values) => {
            if (!err && !errorMess) {
                try {
                    const fee = mul(depositFee, ONE_TRX);
                    const num = mul(numValue, Math.pow(10, Number(precision)));
                    const sideChain = values.sidechain;
                    const list = sideChain && sideChain.split('-');
                    sunWeb.setChainId(list[0]);
                    sunWeb.setSideGatewayAddress(list[1]);
                    // trc10
                    if (CURRENCYTYPE.TRX10 === type) {
                        // todo wangyan
                        const txid = await sunWeb.depositTrc10(id, num, fee, FEELIMIT);
                        this.openModal(txid);
                    } else if (CURRENCYTYPE.TRX20 === type) {
                        const approveData = await sunWeb.approveTrc20(num, FEELIMIT, address);
                        if (approveData) {
                            // todo wangyan
                            // trc20
                            const data = await sunWeb.depositTrc20(num, fee, FEELIMIT, address);
                            this.openModal(data);
                        } else {
                            this.openModal();
                        }
                    } else if (CURRENCYTYPE.TRX === type) {
                        const data = await sunWeb.depositTrx(num, fee, FEELIMIT);
                        this.openModal(data);
                    }
                    this.setState({ isDisabled: false });
                } catch (e) {
                    this.openModal();
                    this.setState({ isDisabled: false });
                }
            }
            this.setState({ isDisabled: false });
        });
    };

    /**
     * Form cancel
     */
    cancel = () => {
        const { onCancel } = this.props;
        onCancel && onCancel();
    };

    /**
     * Form cancel
     */
    sign = () => {
        const { onSign, details } = this.props;
        console.log('details222',details)
        onSign && onSign(details);
    };

    /**
     * get trc20 sideChains
     */
    getSideChains = () => {
        const { option: { trx20MappingAddress } } = this.props;
        trx20MappingAddress.map(v => {
            v.name = v.chainName;
            v.sidechain_gateway = v.sidechainGateway;
        });
        return trx20MappingAddress;
    }

    getParameterValue = async() =>{
        const { details, account } = this.props;
        let hexstr = details.currentTransaction.raw_data.contract[0].parameter.value;
        console.log('hexstr',hexstr)
        let parameterValue = Client.getParameterValue(hexstr);
        console.log('parameterValue',parameterValue)
        //details.contractData.data = parameterValue;
        console.log('details.contractData',details.contractData)
        let parameter = details.contractData;
        let function_selector = details.functionSelector;
        console.log('function_selector',function_selector)
        let contract_address = details.contractData.contract_address;
        console.log('contract_address',contract_address)
        let smartcontract = await account.tronWeb.trx.getContract(contract_address);
        let abi = smartcontract.abi.entrys;
        console.log('abi',abi)
        console.log('parameterValue.data.substring(8)',parameterValue.data.substring(8))
        const args = Utils.decodeParams(parameterValue.data.substring(8),abi,function_selector);
        console.log('args',args)
        this.setState({
            args
        });
    }


    render() {
        const { getFieldDecorator } = this.props.form;
        const { details } = this.props;
        const {  isShowModal, modal, args } = this.state;
        console.log('args',args)
        console.log('details',details)
        let TokenIDList = [];
        let tokenIdData;
        TokenIDList.push(details.contractData)
        if(TokenIDList){
            tokenIdData  = rebuildList(TokenIDList,'asset_name','amount')[0]
        }

        const TransferDetailsItem = (
            <Fragment>
                <div className="form-group">
                    <label>{tu("from")}</label>
                    <span><AddressLink address={details.contractData.owner_address}>{details.contractData.owner_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("to")}</label>
                    <span><AddressLink address={details.contractData.to_address}>{details.contractData.to_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("amount")}</label>
                    <span><TRXPrice amount={details.contractData.amount/ ONE_TRX}/></span>
                </div>
            </Fragment>
        );
        const TransferAssetDetailsItem = (
            <Fragment>
                <div className="form-group">
                    <label>{tu("from")}</label>
                    <span><AddressLink address={details.contractData.owner_address}>{details.contractData.owner_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("to")}</label>
                    <span><AddressLink address={details.contractData.to_address}>{details.contractData.to_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("amount")}</label>
                    <span>{tokenIdData.map_amount}</span>
                </div>
                <div className="form-group">
                    <label>{tu("token")}</label>
                    <span><NameWithId value={details.contractData} notamount totoken/></span>
                </div>
            </Fragment>
        );

        const TriggerSmartTransferDetailsItem = (
            <Fragment>
                <div className="form-group">
                    <label>{tu("contract_triggers_owner_address")}</label>
                    <span><AddressLink address={details.contractData.owner_address}>{details.contractData.owner_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("contract_address")}</label>
                    <span><AddressLink address={details.contractData.contract_address} isContract={true}>{details.contractData.contract_address}</AddressLink></span>
                </div>
                {
                    (details.functionSelector == 'transfer(address,uint256)' && args) &&  <div>
                        <div className="form-group">
                            <label>{tu("from")}</label>
                            <span><AddressLink address={details.contractData.owner_address}>{details.contractData.owner_address}</AddressLink></span>
                        </div>

                        <div className="form-group">
                            <label>{tu("to")}</label>
                            <span><AddressLink address={args[0].value}>{args[0].value}</AddressLink></span>
                        </div>
                        <div className="form-group">
                            <label>{tu("amount")}</label>
                            <span>{tokenIdData.map_amount}</span>
                        </div>
                        <div className="form-group">
                            <label>{tu("token")}</label>
                            <span><NameWithId value={details.contractData} notamount totoken/></span>
                        </div>
                    </div>

                }
            </Fragment>
        );

        const TriggerSmartDetailsItem = (
            <Fragment>
                <div className="form-group">
                    <label>{tu("contract_triggers_owner_address")}</label>
                    <span><AddressLink address={details.contractData.owner_address}>{details.contractData.owner_address}</AddressLink></span>
                </div>
                <div className="form-group">
                    <label>{tu("contract_address")}</label>
                    <span><AddressLink address={details.contractData.contract_address} isContract={true}>{details.contractData.contract_address}</AddressLink></span>
                </div>
            </Fragment>
        );

        // sign btnItem
        const signBtnItem = (
            <button className="btn btn-danger mt-4" style={{ width: '100%' }}
                    onClick={this.sign}>{tu('signature')}</button>
        );
        // close btnItem
        const closeBtnItem = (
            <button className="btn btn-danger mt-4" style={{ width: '100%' }}
                    onClick={this.cancel}>{tu('compile_close')}</button>
        );
        return (
            <div>
                <Modal
                    title={tu('signature_details')}
                    visible={isShowModal}
                    onCancel={this.cancel}
                    footer={null}
                >
                   <div className="signature_details">
                       <div className="form-group">
                           <label>{tu("signature_status")}:</label>
                           <span>
                                {
                                    details.state == 0 && <span style={{color:'#69C265'}}>{tu("signature_details_processing")}</span>
                                }
                                {
                                    details.state == 1 && <span style={{color:'#69C265'}}>{tu("signature_successful")}</span>
                                }
                                {
                                    details.state == 2 && <span style={{color:'#69C265'}}>{tu("signature_failed")}</span>
                                }
                            </span>
                       </div>
                       <div className="form-group">
                           <label>{tu("type")}:</label>
                           <span>
                               {details.contractType}
                            </span>
                       </div>
                       <Fragment>
                           {details.contractType == 'TransferContract' ?TransferDetailsItem:''}
                           {details.contractType == 'TransferAssetContract' ?TransferAssetDetailsItem:''}
                           {details.contractType == 'TriggerSmartContract' && details.functionSelector != 'transfer(address,uint256)' ? TriggerSmartDetailsItem :''}
                           {details.contractType == 'TriggerSmartContract' && details.functionSelector == 'transfer(address,uint256)' ? TriggerSmartDetailsItem :''}
                       </Fragment>

                       <div className="form-group border-0">
                           <label>{tu("signature_list")}:</label>
                           <div className="text-left">{details.currentWeight + '/' + details.threshold}</div>
                       </div>
                       <div className="form-group d-block border-0">
                           {
                               details.signatureProgress.map((item,index)=>{
                                   return    <div key={index} className="d-flex mt-1">
                                       <div style={{width:250}}>
                                           <AddressLink address={item.address}>{item.address}</AddressLink>
                                       </div>
                                       <div className="ml-2 p-1 d-block signature-weight">{item.weight}</div>
                                       {item.isSign == 1 ? <i className="ml-2 signature-siged"></i>:<div className="ml-2" style={{width:12}}></div>}
                                       {item.signTime && <div className="ml-2">
                                           <FormattedDate value={item.signTime*1000}/>&nbsp;
                                           <FormattedTime value={item.signTime*1000}
                                                          hour='numeric'
                                                          minute="numeric"
                                                          second='numeric'
                                                          hour12={false}
                                           />
                                       </div>}
                                   </div>
                               })
                           }
                       </div>
                   </div>
                    {details.state == 0 &&  details.multiState == 10 ? signBtnItem :closeBtnItem}
                </Modal>
                {modal}
            </div>
        );
    }
}

function mapStateToProps(state, ownProp) {
    return {
        sideChains: state.app.sideChains,
        account: state.app.account,
        fees: state.app.fees,
    };
}

const mapDispatchToProps = {
};

export default Form.create({ name: 'pledge' })(connect(mapStateToProps, mapDispatchToProps)(injectIntl(SignDetailsModal)));