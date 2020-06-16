import React, { Component } from 'react';
import * as mineService from './service';

import './index.css';

function isFunction(obj) {
    return obj && typeof obj == "function";
}


/**
 * 阿里云滑动验证组件
 * 
 * onSuccess 滑动成功回调 onSuccess({msg: '成功', result: true})
 * onFail 滑动验证失败回调 onFail({msg: '失败', result: false})
 * example
 * import AliRiskCheck from '@components/AliRiskCheck';
 * <AliRiskCheck
    onSuccess={this.handleOnSuccess}
    onFail={this.handleOnFail}
    />
 */



export default class AliRiskCheck extends Component {
    constructor(props) {
        super(props);
        this.state = {
            disabled: true,
            slideCodeError: ''
        }
        this.riskCheckParams = {};
    }

    componentDidMount() {
        this.injectScript(this.init);
    }

    injectScript = (cb) => {
        let script = document.querySelector('#script');
        if (script) {
            cb && cb();
            return;
        }
        const head = document.getElementsByTagName('head')[0];
        script = document.createElement('script');
        script.src = '//g.alicdn.com/sd/nch5/index.js';
        script.id = 'script';
        // script.async = true;
        head.appendChild(script);
        script.onload = script.onreadystatechange = function () {
            cb && cb();
        }
    }

    init = () => {
        this.initNoCaptcha();
        this.fetchRiskToken();
    }

    initNoCaptcha = () => {
        const nc_appkey = '1654';
        const nc_scene = 'login_h5';
        const nc_token = [nc_appkey, Date.now(), Math.random()].join(':');
        try {
            if (!window.NoCaptcha) {
                throw new Error('NoCaptcha注入失败');
            }

            this.nc = NoCaptcha.init({
                renderTo: '#js-rick-captcha',
                appkey: nc_appkey,
                scene: nc_scene,
                token: nc_token,
                bannerHidden: false,
                retryTimes: 5,
                trans: { "key1": "code200" },
                callback: (data) => {
                    this.riskCheckParams = {
                        ...this.riskCheckParams,
                        aliCsessionid: data.csessionid,
                        sig: data.sig,
                        token: nc_token,
                    };
                    this.getAliRiskCheck();
                },
                error: (e) => {
                    console.error('noCaptcha', e);
                }
            });
            NoCaptcha.setEnabled(true);
            this.nc.reset(); // 请务必确保这里调用一次reset()方法
            NoCaptcha.upLang('cn', {
                'LOADING': "加载中...",//加载
                'SLIDER_LABEL': "请向右滑动滑块",//等待滑动
                'CHECK_Y': "验证通过",//通过
                'ERROR_TITLE': "非常抱歉，这出错了...",//拦截
                'CHECK_N': "验证未通过", //准备唤醒二次验证
                'OVERLAY_INFORM': "经检测你当前操作环境存在风险，请输入验证码",//二次验证
                'TIPS_TITLE': "验证码错误，请重新输入"//验证码输错时的提示
            });
        } catch (e) {
            console.log(e);
        }
    }

    fetchRiskToken = async () => {
        const { code, data } = await mineService.getRiskToken();
        if (code === 0) {
            this.riskCheckParams = {
                ...this.riskCheckParams,
                riskToken: data.riskToken
            };
        }
    }

    //滑动验证
    getAliRiskCheck = async () => {
        const {
            aliCsessionid,
            sig,
            token,
            riskToken
        } = this.riskCheckParams;

        try {
            if (!riskToken) {
                await this.fetchRiskToken();
                setTimeout(() => {
                    this.nc.reset(); // 重置滑动验证
                }, 600)
            }

            const parmas = {
                csessionid: aliCsessionid,
                sig: sig,
                token: token,
                risktoken: riskToken,
                scene: 1
            };
            const {
                data,
                code
            } = await mineService.getAliSlide(parmas);
            if (code === 1) {
                const checkResult = await mineService.checkRisk({
                    csessionid: data.csessionid,
                    riskToken: riskToken
                })
                if (checkResult.code === 0) {
                    if (isFunction(this.props.onSuccess)) {
                        this.props.onSuccess({
                            msg: '滑动校验通过',
                            result: true
                        })
                    }
                } else {
                    if (isFunction(this.props.onFail)) {
                        this.props.onFail({
                            msg: '滑动校验未通过',
                            result: false
                        })
                    }
                }
            } else {
                if (isFunction(this.props.onFail)) {
                    this.props.onFail({
                        msg: '获取csessionid错误',
                        result: false
                    })
                }
                this.setState({
                    slideCodeError: '滑动验证未通过'
                }, () => this.handleSlideCodeError())
                setTimeout(() => {
                    this.nc.reset(); // 重置滑动验证
                }, 600)
            }
        } catch (e) {
            if (isFunction(this.props.onFail)) {
                this.props.onFail({
                    msg: '获取csessionid服务错误',
                    result: false
                })
            }
            this.setState({
                slideCodeError: '滑动验证未通过'
            }, () => this.handleSlideCodeError())
            setTimeout(() => {
                this.nc.reset(); // 重置滑动验证
            }, 600)
        }
    }

    handleSlideCodeError = () => {
        setTimeout(() => {
            this.setState({
                slideCodeError: ''
            })
        }, 1200)
    }

    render() {
        const { slideCodeError } = this.state;
        return (
            <section className="risk-container">
                <div className="sliding-box drag" id="js-rick-captcha" />
                <p className="error">
                    {slideCodeError ? '验证失败，请重试' : ''}
                </p>
            </section>
        )
    }
}
