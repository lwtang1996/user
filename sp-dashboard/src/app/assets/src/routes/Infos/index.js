/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Button, Form, Popconfirm, Input, Table } from 'antd';

import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import { Select } from 'antd';

// import styles from './index.less';


const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
    <EditableContext.Provider value={form}>
        <tr {...props} />
    </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

@connect(({ information, loading }) => ({
    information,
    loadingInformations: loading.effects['infos/fetch'],
}))

class Infos extends React.Component {

    constructor(props) {
        super(props);

        this.columns = [{
            title: 'Name',
            dataIndex: 'name',
            align: 'center',
        }, {
            title: 'Options',
            dataIndex: 'options',
            align: 'center',
            render: (text, record) => (
                this.state.data.length >= 1
                    ? (
                        <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
                            <a href="javascript:void(0);">Delete</a>
                        </Popconfirm>
                    ) : null
            ),
        }];

        this.state = {
            submitting: false,
            confirmDirty: false,
            data: [{
                key: 0,
                name: 'peer0',
                options: '',
            }],
            count: 1,
        };
    };

    handleConfirmBlur = (e) => {
      const value = e.target.value;
      this.setState({ confirmDirty: this.state.confirmDirty || !!value });
    };

    compareToFirstPassword = (rule, value, callback) => {
        const form = this.props.form;
        if (value && value !== form.getFieldValue('org_passwd')) {
            callback('Two password that you enter is inconsistent!');
        } else {
            callback();
        }
    };

    handleDelete = (key) => {
        const data = [...this.state.data];
        this.setState({ data: data.filter(item => item.key !== key) });
    };

    handleAdd = () => {
        const { count, data } = this.state;
        const newData = {
            key: count,
            name: `peer${count}`,
            options: '',
        };
        this.setState({
            data: [...data, newData],
            count: count + 1,
        });
    };

    validateToNextPassword = (rule, value, callback) => {
        const form = this.props.form;
        if (value && this.state.confirmDirty) {
            form.validateFields(['confirm'], { force: true });
        }
        callback();
    };

    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            if(!err){
                //const dataSubmit = [values, this.state.data];
                this.setState({
                    submitting: true,
                });
                const dataSubmit = values;
                dataSubmit.peer = 2;
                //dataSubmit.peer = this.state.data;
                //console.log(dataSubmit);
                this.props.dispatch({
                    type: 'information/orgInitial',
                    payload: {
                        ...dataSubmit,
                    }
                })
            }
        })
    }

    render() {

        const { data } = this.state;
        const components = {
            body: {
                row: EditableFormRow,
            },
        };
        const columns = this.columns;

        const formItemLayout = {
            labelCol: {
                xs: { span: 24 },
                sm: { span: 8 },
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 },
            },
        };

        const tailFormItemLayout = {
            wrapperCol: {
                xs: {
                    span: 24,
                    offset: 0,
                },
                sm: {
                    span: 16,
                    offset: 8,
                },
            },
        };

        const { getFieldDecorator } = this.props.form;
        const { TextArea } = Input;
        const CA_PEM=[1];
        const CA_PEM_Options = CA_PEM.map(
          (capem_size) => (
            <Option value={capem_size}>{capem_size}</Option>
          )
        );
        const CA_SK = [1];
        const CA_SK_Options = CA_SK.map(
          (cask_size) => (
            <Option value={cask_size}>{cask_size}</Option>
          )
        );
        const networks = ['fabric-1.4'];
        const network_Options = networks.map(
          (network) => (
            <Option value={network}>{network}</Option>
          )
        );
        const consensus_plugins = ['Solo', 'Kafka'];
        const consensus_Options = consensus_plugins.map(
          (consensus) => (
            <Option value={consensus}>{consensus}</Option>
          )
        );

        return (
            <PageHeaderLayout>
                <Form {...formItemLayout} onSubmit={this.handleSubmit}>
                    <Form.Item label="Organization classify">
                        Server Provider
                    </Form.Item>
                    <Form.Item label="Host">
                        testhost
                    </Form.Item>
                    <Form.Item label="服务提供商名称">
                        {getFieldDecorator('sp_name', {
                            rules: [{ required: true, message: 'Please input the sp name!'}],
                        })(
                            <Input />
                            )}
                    </Form.Item>
                    <Form.Item label="组织名称">
                        {getFieldDecorator('sp_org_name', {
                            rules: [{ required: true, message: 'Please input the organization name!'}],
                        })(
                            <Input />
                            )}
                    </Form.Item>
                    {/* <Form.Item label="MSP ID">
                        {getFieldDecorator('msp_id', {
                            rules: [{ required: true, message: 'Please input the MSP ID!'}],
                        })(
                            <Input />
                            )}
                    </Form.Item>
                    <Form.Item label="登录密码">
                        {getFieldDecorator('org_passwd', {
                            rules: [{ required: true, message: 'Please set the password!'
                            }, {
                                validator: this.validateToNextPassword,
                            }],
                        })(
                            <Input type="password" />
                            )}
                    </Form.Item>
                    <Form.Item label="确认密码">
                        {getFieldDecorator('confirm', {
                            rules: [{ required: true, message: 'Please confirm your password!'
                            }, {
                                validator: this.compareToFirstPassword,
                            }],
                        })(
                            <Input type="password" onBlur={this.handleConfirmBlur} />
                            )}
                    </Form.Item>
                    <Form.Item label="CA根证书">
                        {getFieldDecorator('ca_pem', {
                            rules: [{ required: true, message: 'Please input the ca root certificate!'}],
                        })(
                            <TextArea rows={4} />
                            )}
                    </Form.Item>
                    <Form.Item label="CA根私钥">
                        {getFieldDecorator('ca_sk', {
                            rules: [{ required: true, message: 'Please input the ca private key!'}],
                        })(
                            <TextArea rows={4} />
                        )}
                    </Form.Item> */}
                    <Form.Item label="CA">
                      {getFieldDecorator('ca', {
                        initialValue: CA_PEM[0],
                        rules: [
                          {
                            required: true,
                            message: 'need',
                          },
                        ],
                      })(<Select>{CA_PEM_Options}</Select>)}
                    </Form.Item>
                    <Form.Item label="order">
                      {getFieldDecorator('orderer', {
                        initialValue: CA_SK[0],
                        rules: [
                          {
                            required: true,
                            message: 'need',
                          },
                        ],
                      })(<Select>{CA_SK_Options}</Select>)}
                    </Form.Item>
                    <Form.Item label="网络类型">
                      {getFieldDecorator('network_type', {
                        initialValue: networks[0],
                        rules: [
                          {
                            required: true,
                            message: 'need',
                          },
                        ],
                      })(<Select>{network_Options}</Select>)}
                    </Form.Item>
                    <Form.Item label="共识策略">
                      {getFieldDecorator('consensus_plugin', {
                        initialValue: consensus_plugins[0],
                        rules: [
                          {
                            required: true,
                            message: 'need',
                          },
                        ],
                      })(<Select>{consensus_Options}</Select>)}
                    </Form.Item>
                    <Form.Item label="节点">
                        <Button type="primary" icon="plus" onClick={this.handleAdd}>Add Node</Button>
                        <Table
                            columns={columns}
                            dataSource={data}
                            components={components}
                            bordered={true}
                            size="small"
                        />
                    </Form.Item>
                    <Form.Item {...tailFormItemLayout}>
                        <Button type="primary" htmlType='submit' loading={this.state.submitting}>
                            初始化
                        </Button>
                    </Form.Item>
                </Form>
            </PageHeaderLayout>
        );
    }
}

export default Infos = Form.create()(Infos);